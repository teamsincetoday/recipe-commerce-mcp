/**
 * Vitest globalSetup: rebuild better-sqlite3 native binary.
 *
 * better-sqlite3 binary drifts after any nvm/Node.js version switch.
 * Symptom: test segfault or SIGABRT on first SQLite operation.
 * Fix (manual): npm rebuild better-sqlite3
 *
 * This globalSetup runs once before all test files (not per-worker).
 * It silently rebuilds the binary so tests pass after nvm switches.
 *
 * EXP: pretest automation to eliminate recurring binary drift (4+ occurrences).
 */

import { execSync } from "node:child_process";
import { resolve } from "node:path";

export function setup(): void {
  const cwd = resolve(import.meta.dirname, "../..");
  try {
    execSync("npm rebuild better-sqlite3 --quiet", { cwd, stdio: "ignore" });
  } catch {
    // Non-fatal — tests will fail naturally if rebuild was needed and failed.
  }
}
