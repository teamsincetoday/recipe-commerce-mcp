import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Rebuild better-sqlite3 before tests — prevents binary drift after nvm switches.
    globalSetup: ["./tests/setup/rebuild-sqlite.ts"],
    // Serialize test files to eliminate SQLite write contention.
    // pool:"forks" + maxWorkers:1 replaces the removed poolOptions.forks.singleFork (Vitest 4).
    pool: "forks",
    maxWorkers: 1,
    // Cold fork load of better-sqlite3 native module can exceed 5s default.
    testTimeout: 15000,
  },
});
