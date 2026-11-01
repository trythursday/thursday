/**
 * Thursday runs on node 24+, and on bun when bun is what is installed.
 *
 * Both read the same `node:` APIs, so the only thing that differs is how each
 * one is asked to run a `.ts` file: bun wants `run`, node does not. Everything
 * that shells out to a Thursday script, and everything that bakes a command
 * into a skill or the config, goes through here.
 */

import process from "node:process";

const versions = process.versions as Record<string, string | undefined>;

export const isBun = Boolean(versions.bun);

/** The interpreter, and `run` when it needs one, then the script and its args. */
export function tsArgs(script: string, args: string[] = []) {
  return isBun ? ["run", script, ...args] : [script, ...args];
}

/** The same as one shell command: what the config records and skills bake. */
export function runtimeCommand() {
  const exe = process.execPath.includes(" ")
    ? `"${process.execPath}"`
    : process.execPath;
  return isBun ? `${exe} run` : exe;
}
