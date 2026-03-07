/**
 * Cloudflare Workers KV telemetry — drop-in for usage-metering.ts in Workers context.
 * Keys: `meter:{tool}:{YYYY-MM-DD}` → DayStats JSON, 8-day TTL.
 * Approximate (KV is not atomic). Acceptable for traction evaluation, not billing.
 */

// KV interface (matches @cloudflare/workers-types, no import needed)
export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface MeteringEvent {
  toolName: string;
  paymentMethod: "free_tier" | "x402" | "api_key";
  amountUsd?: number;
  processingTimeMs?: number;
  success?: boolean;
}

export interface DayStats {
  calls: number;
  errors: number;
  revenueUsd: number;
  totalProcessingMs: number;
}

export interface ToolSummary {
  toolName: string;
  days: DayStats[]; // index 0 = today, 1 = yesterday, etc.
  totals: DayStats;
}

const TTL = 8 * 24 * 60 * 60; // 8 days
const EMPTY: DayStats = { calls: 0, errors: 0, revenueUsd: 0, totalProcessingMs: 0 };

function dateString(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

function parse(raw: string | null): DayStats {
  if (!raw) return { ...EMPTY };
  try { return JSON.parse(raw) as DayStats; } catch { return { ...EMPTY }; }
}

export class CloudflareMetering {
  constructor(private readonly kv: KVNamespace) {}

  /** Record a tool call. Fire-and-forget — do not await in hot path. */
  async record(event: MeteringEvent): Promise<void> {
    const key = `meter:${event.toolName}:${dateString(0)}`;
    const cur = parse(await this.kv.get(key));
    await this.kv.put(key, JSON.stringify({
      calls: cur.calls + 1,
      errors: event.success === false ? cur.errors + 1 : cur.errors,
      revenueUsd: cur.revenueUsd + (event.amountUsd ?? 0),
      totalProcessingMs: cur.totalProcessingMs + (event.processingTimeMs ?? 0),
    } satisfies DayStats), { expirationTtl: TTL });
  }

  /** Get per-tool stats for the last N days. Used by /usage endpoint. */
  async getToolSummary(toolName: string, days = 7): Promise<ToolSummary> {
    const dayStats = await Promise.all(
      Array.from({ length: days }, (_, i) =>
        this.kv.get(`meter:${toolName}:${dateString(i)}`).then(parse)
      )
    );
    const totals = dayStats.reduce(
      (acc, d) => ({
        calls: acc.calls + d.calls, errors: acc.errors + d.errors,
        revenueUsd: acc.revenueUsd + d.revenueUsd,
        totalProcessingMs: acc.totalProcessingMs + d.totalProcessingMs,
      }),
      { ...EMPTY }
    );
    return { toolName, days: dayStats, totals };
  }
}
