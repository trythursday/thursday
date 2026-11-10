#!/usr/bin/env bun
/**
 * Resolve one procedure and print it.
 *
 * The personal copy wins. The checkout is the fallback for a file the personal
 * dir does not have, which after setup means it is usually not needed. One
 * procedure, one read: an agent should never have to try both.
 *
 *   bun run scripts/th-proc.ts 000-th-how-to-talk.md
 *   bun run scripts/th-proc.ts --find 030-th-learn.md
 *   bun run scripts/th-proc.ts --json 030-th-learn.md
 *   bun run scripts/th-proc.ts
 *   bun run scripts/th-proc.ts --list
 *
 * Contents go to stdout by default; `--find` prints the path instead. Everything
 * else goes to stderr. Exit 1 means missing, exit 2 means Thursday is not set up.
 */

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";

type Config = {
  personal: string;
  checkout: string;
};

function dataRoot(platform = process.platform) {
  const xdg = process.env.XDG_DATA_HOME;
  if (xdg) return join(xdg, "thursday");
  if (platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "thursday");
  }
  if (platform === "win32") {
    const local = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    return join(local, "thursday");
  }
  return join(homedir(), ".local", "share", "thursday");
}

/**
 * One `key = value` from one toml table. Written out instead of a regex because
 * a regex for this is unreadable and this file is short enough to scan.
 */
function tableValue(text: string, table: string, key: string) {
  let current = "";

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      current = line.slice(1, -1).trim();
      continue;
    }

    if (current !== table) continue;

    const equals = line.indexOf("=");
    if (equals === -1) continue;
    if (line.slice(0, equals).trim() !== key) continue;

    const value = line.slice(equals + 1).trim();
    if (!value.startsWith('"')) return value;
    const end = value.indexOf('"', 1);
    if (end === -1) return value.slice(1);
    return value.slice(1, end);
  }

  return undefined;
}

async function readConfig(path: string): Promise<Config> {
  if (!existsSync(path)) {
    console.error(`Thursday is not set up: no config at ${path}`);
    console.error("Run scripts/setup.ts, or read the checkout copy by hand.");
    process.exit(2);
  }

  const text = await readFile(path, "utf8");
  const checkout = tableValue(text, "install", "repo");
  const personal =
    tableValue(text, "personal", "procedures") ??
    join(tableValue(text, "personal", "dir") ?? "", "procedures");

  if (!checkout) {
    console.error(`${path} has no [install].repo. Run scripts/setup.ts again.`);
    process.exit(2);
  }

  return { personal, checkout };
}

function candidates(config: Config) {
  return [
    { source: "personal", dir: config.personal },
    { source: "checkout", dir: join(config.checkout, "procedures") },
  ];
}

function resolveOne(config: Config, name: string) {
  for (const { source, dir } of candidates(config)) {
    const path = join(dir, name);
    if (existsSync(path)) return { path, source };
  }
  return undefined;
}

async function list(config: Config) {
  const seen = new Set<string>();

  for (const { source, dir } of candidates(config)) {
    if (!existsSync(dir)) continue;
    for (const entry of (await readdir(dir)).sort()) {
      if (!entry.endsWith(".md")) continue;
      if (seen.has(entry)) continue;
      seen.add(entry);
      console.log(`${entry}\t${source}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const find = args.includes("--find");
  const wantsList = args.includes("--list");
  const names = args.filter((arg) => !arg.startsWith("--"));

  if (args.includes("--help") || args.includes("-h")) {
    console.error(
      [
        "usage: bun run scripts/th-proc.ts <file.md>",
        "       bun run scripts/th-proc.ts --find <file.md>",
        "       bun run scripts/th-proc.ts --json <file.md>",
        "       bun run scripts/th-proc.ts",
        "       bun run scripts/th-proc.ts --list",
        "",
        "  the personal copy wins; the checkout is the fallback",
        "  stdout: the procedure, or its one path with --find",
        "  no name prints the list, same as --list",
      ].join("\n"),
    );
    return 0;
  }

  const config = await readConfig(
    process.env.THURSDAY_CONFIG ?? join(dataRoot(), "thursday.toml"),
  );

  if (wantsList) {
    await list(config);
    return 0;
  }

  const name = names[0];
  if (!name) {
    await list(config);
    return 0;
  }

  if (name.includes("/") || name.includes("\\")) {
    console.error(`${name} is not a procedure name. Pass the file, not a path.`);
    return 2;
  }

  const found = resolveOne(config, name);
  if (!found) {
    console.error(`no ${name} in either place:`);
    for (const { source, dir } of candidates(config)) {
      console.error(`  ${source.padEnd(8)} ${dir}`);
    }
    return 1;
  }

  if (json) {
    console.log(JSON.stringify({ path: found.path, source: found.source }, null, 2));
  } else if (find) {
    console.log(found.path);
  } else {
    process.stdout.write(await readFile(found.path, "utf8"));
  }
  return 0;
}

process.exit(await main());
