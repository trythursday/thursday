/**
 * Test-only. Thursday ships for node 24+ and for bun, so every script a user
 * runs is exercised under each runtime that is installed on this machine.
 *
 * `run` is how that runtime is asked for a `.ts` file: bun wants `run` before
 * the path, node does not. The version floor only applies to node — bun runs
 * the same source on its own schedule.
 */

import { spawnSync } from "node:child_process";

const NODE_FLOOR = 24;

export type Runtime = {
  name: "node" | "bun";
  command: string;
  run: string[];
};

function usable(name: "node" | "bun"): Runtime | undefined {
  const probe = spawnSync(name, ["--version"], { encoding: "utf8" });
  if (probe.status !== 0) return undefined;

  if (name === "node") {
    const major = Number(probe.stdout.trim().replace(/^v/, "").split(".")[0]);
    if (!(major >= NODE_FLOOR)) return undefined;
  }

  return { name, command: name, run: name === "bun" ? ["run"] : [] };
}

export function availableRuntimes(): Runtime[] {
  return (["node", "bun"] as const)
    .map(usable)
    .filter((runtime): runtime is Runtime => Boolean(runtime));
}
