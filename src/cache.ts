/**
 * SQLite cache + usage metering for Recipe Commerce MCP.
 *
 * Two concerns in one file (both lightweight):
 * 1. RecipeCache — stores extraction results keyed by recipe_id
 * 2. UsageTracker — tracks daily free-tier calls per agent, records usage events
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { ExtractionResult } from "./types.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_DB_PATH = "./data/cache.db";
/** Free tier calls per day per agent. */
const FREE_TIER_DAILY_LIMIT = 3;

// ============================================================================
// CACHE
// ============================================================================

export class RecipeCache {
  private readonly db: Database.Database;

  // Prepared statements
  private readonly stmtGet: Database.Statement;
  private readonly stmtSet: Database.Statement;
  private readonly stmtGetDailyCount: Database.Statement;
  private readonly stmtRecordUsage: Database.Statement;

  constructor(dbPath?: string) {
    const rawPath = dbPath ?? process.env["CACHE_DIR"] ?? DEFAULT_DB_PATH;
    const resolvedPath = rawPath === ":memory:" ? ":memory:" : resolve(rawPath);

    // Ensure directory exists (skip for in-memory db)
    if (resolvedPath !== ":memory:") {
      const dir = resolvedPath.substring(0, resolvedPath.lastIndexOf("/"));
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(resolvedPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");

    this.initSchema();

    this.stmtGet = this.db.prepare(
      `SELECT data FROM recipe_cache WHERE recipe_id = ?`
    );

    this.stmtSet = this.db.prepare(
      `INSERT OR REPLACE INTO recipe_cache (recipe_id, data, created_at)
       VALUES (?, ?, ?)`
    );

    this.stmtGetDailyCount = this.db.prepare(
      `SELECT COUNT(*) as count FROM usage_events
       WHERE agent_id = ? AND DATE(timestamp, 'unixepoch') = DATE('now')`
    );

    this.stmtRecordUsage = this.db.prepare(
      `INSERT INTO usage_events (agent_id, tool_name, timestamp, payment_method, amount_usd, success)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
  }

  // --------------------------------------------------------------------------
  // Extraction cache
  // --------------------------------------------------------------------------

  get(recipeId: string): ExtractionResult | null {
    const row = this.stmtGet.get(recipeId) as { data: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.data) as ExtractionResult;
    } catch {
      return null;
    }
  }

  set(recipeId: string, result: ExtractionResult): void {
    const now = Math.floor(Date.now() / 1000);
    this.stmtSet.run(recipeId, JSON.stringify(result), now);
  }

  // --------------------------------------------------------------------------
  // Free tier metering
  // --------------------------------------------------------------------------

  /**
   * Check if agent is within free tier limit.
   * Returns true if the call is allowed.
   */
  checkFreeTier(agentId: string): boolean {
    const row = this.stmtGetDailyCount.get(agentId) as { count: number };
    return row.count < FREE_TIER_DAILY_LIMIT;
  }

  /**
   * Get the number of free calls used today by this agent.
   */
  getFreeTierUsed(agentId: string): number {
    const row = this.stmtGetDailyCount.get(agentId) as { count: number };
    return row.count;
  }

  /**
   * Record a tool usage event.
   */
  recordUsage(params: {
    agentId: string;
    toolName: string;
    paymentMethod: string;
    amountUsd: number;
    success: boolean;
  }): void {
    const now = Math.floor(Date.now() / 1000);
    this.stmtRecordUsage.run(
      params.agentId,
      params.toolName,
      now,
      params.paymentMethod,
      params.amountUsd,
      params.success ? 1 : 0
    );
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  close(): void {
    this.db.close();
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recipe_cache (
        recipe_id  TEXT PRIMARY KEY,
        data       TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS usage_events (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id       TEXT NOT NULL,
        tool_name      TEXT NOT NULL,
        timestamp      INTEGER NOT NULL,
        payment_method TEXT,
        amount_usd     REAL DEFAULT 0,
        success        INTEGER DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_usage_agent_day
        ON usage_events(agent_id, timestamp);
    `);
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let _instance: RecipeCache | null = null;

/**
 * Get the shared cache instance (singleton per process).
 * Pass a custom dbPath on first call to override the default location.
 */
export function getCache(dbPath?: string): RecipeCache {
  if (!_instance) {
    _instance = new RecipeCache(dbPath);
  }
  return _instance;
}

export { FREE_TIER_DAILY_LIMIT };
