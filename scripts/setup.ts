#!/usr/bin/env bun
/**
 * Install Thursday.
 *
 * One root holds everything the install owns:
 *
 *     <root>/thursday.toml
 *     <root>/checkout/      git clone
 *     <root>/state/         sidecar, logs, caches
 *     <root>/.gitignore     ignores checkout/ and state/
 *
 * The user's own procedures, scratch, and notes live outside the root, so they
 * survive a reinstall.
 *
 * Every action has a human path and a machine path. Without flags it asks one
 * question and prints what it plans to do. With flags it does exactly that and
 * says nothing on stdout. `--json` puts the resolved paths on stdout; everything
 * else goes to stderr.
 *
 * Usage:
 *     bun run scripts/setup.ts
 *     bun run scripts/setup.ts --personal ~/th --skills-dir ~/.commandcode/skills --yes
 *     bun run scripts/setup.ts --dry-run
 *     bun run scripts/setup.ts --home /tmp/fake --personal /tmp/fake/th --yes
 *     bun run scripts/setup.ts --json
 *     bun run scripts/setup.ts --undo
 *     bun run scripts/setup.ts --refresh-shipped
 *
 * Runs on bun, or on node 24+. Whichever one runs it is the one it records in
 * `[install].runtime` and bakes into the generated skills.
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface, type Interface } from "node:readline";
import { parseArgs } from "node:util";
import process from "node:process";
import { runtimeCommand, tsArgs } from "./runtime.ts";

const REPO = resolve(import.meta.dirname, "..");
const VERSION = "0.2.0";

type Layout = {
  home: string;
  root: string;
  checkout: string;
  state: string;
  config: string;
  personal: string;
  procedures: string;
  scratch: string;
  temp: string;
  skillsDirs: string[];
  manifest: string;
  source: string;
};

function fail(message: string, code = 2): never {
  console.error(message);
  process.exit(code);
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function expand(path: string, home: string) {
  return path.startsWith("~") ? join(home, path.slice(1)) : resolve(path);
}

const SCHEME_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789+.-";

/** RFC 3986 scheme: a letter, then letters, digits, `+`, `-`, or `.`. */
function isScheme(text: string) {
  // One letter is excluded on purpose: `C:` is a drive, not a scheme.
  if (text.length < 2) return false;
  const first = text[0].toLowerCase();
  if (first < "a" || first > "z") return false;

  for (const char of text.slice(1).toLowerCase()) {
    if (!SCHEME_CHARS.includes(char)) return false;
  }

  return true;
}

/**
 * scp-style remote, `[user@]host:path`. The colon comes before any separator,
 * and the host is one label. The user is optional: `foo:repo.git` and
 * `github.com:foo/repo.git` are both cloned exactly as written.
 *
 * The one exception is a Windows drive, where a single letter before `:/` or
 * `:\` is a path, not a host.
 */
function isScpRemote(source: string) {
  const colon = source.indexOf(":");
  if (colon < 1) return false;

  const before = source.slice(0, colon);
  const at = before.indexOf("@");
  const host = at === -1 ? before : before.slice(at + 1);
  if (!host) return false;
  if (host.includes("/") || host.includes("\\")) return false;

  if (host.length === 1) {
    const next = source[colon + 1];
    if (next === "/" || next === "\\") return false;
  }

  return true;
}

/** A remote is cloned verbatim. A local path still gets `~` and cwd resolved. */
export function cloneSource(source: string, home: string) {
  const schemeEnd = source.indexOf("://");
  const hasScheme = schemeEnd > 0 && isScheme(source.slice(0, schemeEnd));

  return hasScheme || isScpRemote(source) ? source : expand(source, home);
}

const NOT_A_PROCEDURE = new Set(["migrations"]);

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Every shipped procedure, as a path relative to `procedures/`. */
async function shippedProcedures(from: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];

  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (NOT_A_PROCEDURE.has(entry.name)) continue;
    const rel = prefix ? join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      out.push(...(await shippedProcedures(join(from, entry.name), rel)));
      continue;
    }

    out.push(rel);
  }

  return out;
}

async function copyMissing(
  from: string,
  to: string,
  rel: string,
  dry: boolean,
  counts: { copied: number; kept: number },
  written: Record<string, string>,
) {
  if (!dry) await mkdir(to, { recursive: true });

  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (NOT_A_PROCEDURE.has(entry.name)) continue;

    const source = join(from, entry.name);
    const target = join(to, entry.name);
    const name = rel ? join(rel, entry.name) : entry.name;

    if (entry.isDirectory()) {
      await copyMissing(source, target, name, dry, counts, written);
      continue;
    }

    const shipped = await readFile(source);

    if (await exists(target)) {
      counts.kept++;
      // Already there and byte-identical: setup's copy, untouched. Record it, so
      // a later release can tell it from an edit.
      if (shipped.equals(await readFile(target))) written[name] = sha256(shipped);
      continue;
    }

    if (!dry) await copyFile(source, target);
    counts.copied++;
    written[name] = sha256(shipped);
  }
}

export type Materialized = {
  copied: number;
  kept: number;
  /** path under the personal procedures dir -> sha256 of the copy sitting there */
  written: Record<string, string>;
};

/**
 * Copy the shipped procedures into the personal dir once. An existing file is
 * never overwritten, so a user's copy — and their edits — win from then on.
 *
 * Every copy that ends up identical to the shipped file is recorded by hash.
 * That record is what lets a later release tell a stale copy from an edit;
 * existence alone cannot, and guessing means overwriting someone's work.
 */
export async function materializeProcedures(
  checkout: string,
  procedures: string,
  dry: boolean,
): Promise<Materialized> {
  const from = join(checkout, "procedures");
  const counts = { copied: 0, kept: 0 };
  const written: Record<string, string> = {};
  if (!(await exists(from))) return { ...counts, written };

  await copyMissing(from, procedures, "", dry, counts, written);
  return { ...counts, written };
}

export type ShippedState = "current" | "refresh" | "keep";

/**
 * What to do with one personal copy: the shipped bytes, the copy on disk, and
 * the hash setup recorded when it wrote that copy.
 *
 * No record means the copy predates the manifest or was never setup's. Either
 * way its provenance is unknown, so it is left alone.
 */
export function shippedState(
  shipped: Buffer,
  mine: Buffer,
  recorded: string | undefined,
): ShippedState {
  if (shipped.equals(mine)) return "current";
  if (recorded && sha256(mine) === recorded) return "refresh";
  return "keep";
}

function rootFor(home: string, platform = process.platform) {
  const data = process.env.XDG_DATA_HOME;
  if (data) return join(data, "thursday");
  if (platform === "darwin") {
    return join(home, "Library/Application Support/thursday");
  }
  if (platform === "win32") {
    const local = process.env.LOCALAPPDATA ?? join(home, "AppData/Local");
    return join(local, "thursday");
  }
  return join(home, ".local/share/thursday");
}

function defaultPersonal(home: string, platform = process.platform) {
  if (platform === "darwin") return join(home, "Documents/Thursday");
  return join(home, "th");
}

function describe(layout: Layout) {
  return {
    version: VERSION,
    root: layout.root,
    config: layout.config,
    checkout: layout.checkout,
    state: layout.state,
    personal: layout.personal,
    skillsDirs: layout.skillsDirs,
    runtime: runtimeCommand(),
    source: layout.source,
    temp: layout.temp,
  };
}

function configToml(layout: Layout) {
  return `# Written by Thursday setup. Resolved per platform; paths are absolute.
[install]
repo = ${JSON.stringify(layout.checkout)}
version = ${JSON.stringify(VERSION)}
skills = ${JSON.stringify(layout.skillsDirs)}
runtime = ${JSON.stringify(runtimeCommand())}
platform = ${JSON.stringify(process.platform)}

[personal]
dir = ${JSON.stringify(layout.personal)}
procedures = ${JSON.stringify(layout.procedures)}
scratch = ${JSON.stringify(layout.scratch)}
scope = "global"

[paths]
root = ${JSON.stringify(layout.root)}
state = ${JSON.stringify(layout.state)}
temp = ${JSON.stringify(layout.temp)}

[learned]
spiel = false
lenses = false
`;
}

let reader: Interface | undefined;

async function ask(question: string, fallback: string) {
  reader ??= createInterface({ input: process.stdin, output: process.stderr });
  const rl = reader;
  const prompt = `${question}${fallback ? ` [${fallback}]` : ""} `;
  const answer = await new Promise<string>((resolve) => rl.question(prompt, resolve));
  return answer.trim() || fallback;
}

/** Run a command to completion. `quiet` swallows its output. */
async function run(command: string, args: string[], quiet = false) {
  const proc = spawn(command, args, { stdio: quiet ? "ignore" : "inherit" });
  const [code] = (await once(proc, "close")) as [number | null];
  return code ?? 1;
}

async function gitRemote(repo: string) {
  try {
    const proc = spawn("git", ["-C", repo, "remote", "get-url", "origin"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    let out = "";
    for await (const chunk of proc.stdout) out += chunk;
    await once(proc, "close");
    return out.trim();
  } catch {
    return "";
  }
}

async function cloneInto(source: string, target: string) {
  const code = await run("git", ["clone", "--quiet", source, target]);
  if (code !== 0) fail(`could not clone ${source} into ${target}`, 2);

  // A local clone points origin at the local path. Repoint it at the real
  // remote so the checkout can be updated later.
  const origin = await gitRemote(source);
  if (origin && origin !== source) {
    await run("git", ["-C", target, "remote", "set-url", "origin", origin], true);
  }
}

async function generateSkills(checkout: string, skillsDir: string) {
  const generator = join(checkout, "scripts", "gen-th-skills.ts");
  const code = await run(
    process.execPath,
    tsArgs(generator, [
      "--out",
      skillsDir,
      "--repo",
      checkout,
      "--runtime",
      runtimeCommand(),
    ]),
  );
  if (code !== 0) fail(`skill generation failed in ${checkout}`, 2);
}

async function install(layout: Layout, dry: boolean) {
  const steps: [string, string][] = [
    [layout.root, "mkdir"],
    [layout.state, "mkdir"],
    [join(layout.root, ".gitignore"), "write: checkout/ state/"],
    [layout.checkout, "git clone"],
    [layout.personal, "mkdir"],
    [layout.procedures, "mkdir"],
    [layout.procedures, "materialize procedures"],
    [layout.scratch, "mkdir"],
    [layout.config, "write toml"],
    ...layout.skillsDirs.map(
      (dir): [string, string] => [dir, "install skills"],
    ),
  ];

  for (const [path, action] of steps) {
    console.error(`  ${dry ? "would " : ""}${action.padEnd(16)} ${path}`);
  }

  if (dry) return;

  await mkdir(layout.root, { recursive: true });
  await mkdir(layout.state, { recursive: true });
  await writeFile(
    join(layout.root, ".gitignore"),
    "checkout/\nstate/\n",
    "utf8",
  );

  if (await exists(layout.checkout)) {
    console.error("  checkout exists, leaving it alone");
  } else {
    await cloneInto(layout.source, layout.checkout);
  }

  await mkdir(layout.procedures, { recursive: true });
  await mkdir(layout.scratch, { recursive: true });
  await mkdir(dirname(layout.config), { recursive: true });
  await writeFile(layout.config, configToml(layout), "utf8");

  const previous = await readManifest(layout);

  const procedures = await materializeProcedures(
    layout.checkout,
    layout.procedures,
    false,
  );
  console.error(
    `  copied       ${procedures.copied} shipped procedures, kept ${procedures.kept} in place`,
  );

  const names = [...(await generatedSkillNames(layout.checkout))];

  for (const dir of layout.skillsDirs) {
    await mkdir(dir, { recursive: true });
    await generateSkills(layout.checkout, dir);
  }

  // What was written where. Undo reads this instead of guessing from files that
  // may have moved or been updated since.
  await writeManifest(layout, {
    version: VERSION,
    installed_at: new Date().toISOString(),
    root: layout.root,
    personal: layout.personal,
    config: layout.config,
    skills: layout.skillsDirs.map((dir) => ({ dir, entries: names })),
    procedures: mergeProcedures(previous?.procedures, procedures.written),
  });
}

/** Thursday's own skills: the root skill plus one per verb. */
async function generatedSkillNames(checkout: string) {
  const rootSkill = join(checkout, ".agents", "skills", "thursday", "SKILL.md");
  const names = new Set<string>(["thursday"]);
  if (!(await exists(rootSkill))) return names;

  for (const line of (await readFile(rootSkill, "utf8")).split("\n")) {
    const match = line.match(/^\|\s*`(\/th[a-z]*)`\s*\|/);
    if (match) names.add(match[1].slice(1));
  }

  return names;
}

/** Skills directories already recorded in a config, if there is one. */
async function existingSkills(config: string) {
  if (!(await exists(config))) return [] as string[];

  const text = await readFile(config, "utf8");
  const match = text.match(/^skills\s*=\s*(\[[^\]]*\]|"[^"]*")/m);
  if (!match) return [] as string[];

  const raw = match[1].trim();
  if (raw.startsWith("[")) {
    return [...raw.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  }
  return [raw.replace(/"/g, "")];
}

type ManifestProcedure = { path: string; sha256: string };

/**
 * What setup wrote: the skill entries per harness, and each procedure it
 * materialized with the hash of that copy at the time. `--undo` reads the
 * first; `--refresh-shipped` reads the second.
 */
type Manifest = {
  version?: string;
  installed_at?: string;
  root?: string;
  personal?: string;
  config?: string;
  skills?: { dir: string; entries: string[] }[];
  procedures?: ManifestProcedure[];
};

function mergeProcedures(
  previous: ManifestProcedure[] | undefined,
  written: Record<string, string>,
) {
  const byPath = new Map((previous ?? []).map((entry) => [entry.path, entry.sha256]));
  for (const [path, hash] of Object.entries(written)) byPath.set(path, hash);

  return [...byPath.entries()]
    .map(([path, sha256]) => ({ path, sha256 }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

async function writeManifest(layout: Layout, manifest: Manifest) {
  await writeFile(layout.manifest, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

async function readManifest(layout: Layout): Promise<Manifest | undefined> {
  const path = join(layout.root, "state", "install.json");
  if (!(await exists(path))) return undefined;

  try {
    return JSON.parse(await readFile(path, "utf8")) as Manifest;
  } catch {
    fail(`${path} is not valid JSON. Delete it and undo by hand.`, 2);
  }
}

/**
 * Replace the personal copies setup wrote that the user has not touched, from
 * the checkout. A copy whose hash does not match the recorded one is theirs, and
 * is named rather than overwritten.
 *
 * A copy with no record has unknown provenance — it predates the manifest, or it
 * was never setup's — so it is left alone too. `0003-runtime.md` says how to
 * settle those by hand.
 */
async function refreshShipped(layout: Layout, dry: boolean) {
  const from = join(layout.checkout, "procedures");
  if (!(await exists(from))) fail(`no procedures in ${layout.checkout}`, 2);

  const manifest = await readManifest(layout);
  const recorded = new Map(
    (manifest?.procedures ?? []).map((entry) => [entry.path, entry.sha256]),
  );
  const written: Record<string, string> = {};

  for (const rel of await shippedProcedures(from)) {
    const source = join(from, rel);
    const target = join(layout.procedures, rel);
    const shipped = await readFile(source);

    if (!(await exists(target))) {
      console.error(`  ${dry ? "would add" : "adding"}      ${rel}`);
      if (!dry) {
        await mkdir(dirname(target), { recursive: true });
        await copyFile(source, target);
      }
      written[rel] = sha256(shipped);
      continue;
    }

    const state = shippedState(shipped, await readFile(target), recorded.get(rel));

    if (state === "current") {
      console.error(`  current       ${rel}`);
      written[rel] = sha256(shipped);
      continue;
    }

    if (state === "refresh") {
      console.error(`  ${dry ? "would refresh" : "refreshing"} ${rel}`);
      if (!dry) await copyFile(source, target);
      written[rel] = sha256(shipped);
      continue;
    }

    console.error(`  left alone    ${rel} — not setup's copy, or you edited it`);
  }

  if (dry) return;

  await writeManifest(layout, {
    ...(manifest ?? {}),
    version: manifest?.version ?? VERSION,
    root: layout.root,
    personal: layout.personal,
    config: layout.config,
    procedures: mergeProcedures(manifest?.procedures, written),
  });
}

async function undo(layout: Layout, dry: boolean, purgePersonal: boolean) {
  // The manifest says exactly what was written into each harness. Without it we
  // fall back to the checkout, which can only name the current verb set.
  const manifest = await readManifest(layout);
  const skills = manifest?.skills;

  if (
    skills !== undefined &&
    (!Array.isArray(skills) ||
      !skills.every((s) => typeof s?.dir === "string" && Array.isArray(s?.entries)))
  ) {
    fail(
      `${join(layout.root, "state", "install.json")} is not a manifest this version wrote. Delete it and undo by hand.`,
      2,
    );
  }

  const targets = skills ?? [];

  if (!targets.length) {
    const names = [...(await generatedSkillNames(layout.checkout))];
    if (names.length === 1) {
      console.error(
        `  no install manifest at ${join(layout.root, "state", "install.json")}`,
      );
      for (const dir of layout.skillsDirs) {
        console.error(`  remove ${join(dir, "th*")} by hand`);
      }
    }
    for (const dir of layout.skillsDirs) targets.push({ dir, entries: names });
  }

  // Never remove the skills directory itself: it belongs to the harness and
  // holds other people's skills.
  for (const { dir, entries } of targets) {
    for (const name of entries) {
      const path = join(dir, name);
      if (!(await exists(path))) continue;
      console.error(`  ${dry ? "would remove" : "removing"} ${path}`);
      if (!dry) await rm(path, { recursive: true, force: true });
    }
  }

  if (await exists(layout.root)) {
    console.error(`  ${dry ? "would remove" : "removing"} ${layout.root}`);
    if (!dry) await rm(layout.root, { recursive: true, force: true });
  }

  const personal = manifest?.personal ?? layout.personal;

  if (purgePersonal && (await exists(personal))) {
    console.error(`  ${dry ? "would remove" : "removing"} ${personal}`);
    if (!dry) await rm(personal, { recursive: true, force: true });
  } else if (!purgePersonal) {
    console.error("");
    console.error(`  kept ${personal} — your procedures, plus the copies setup made`);
    console.error("  pass --purge-personal to remove it too");
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      home: { type: "string" },
      personal: { type: "string" },
      "skills-dir": { type: "string", multiple: true },
      from: { type: "string" },
      config: { type: "string" },
      root: { type: "string" },
      yes: { type: "boolean", short: "y" },
      "dry-run": { type: "boolean" },
      json: { type: "boolean" },
      undo: { type: "boolean" },
      "purge-personal": { type: "boolean" },
      "refresh-shipped": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.error(
      [
        "usage: bun run scripts/setup.ts [flags]",
        "",
        "  --home <dir>        resolve everything against this home",
        "  --personal <dir>    where your procedures and notes live",
        "  --skills-dir <dir>  where your agent loads skills; repeat for more\n" +
        "                      than one harness (required)",
        "  --from <path|url>   clone from here instead of this checkout",
        "  --root <dir>        override the Thursday root",
        "  --config <path>     override the toml path",
        "  --yes               no questions",
        "  --dry-run           print what would happen, write nothing",
        "  --json              resolved paths on stdout",
        "  --undo              remove what setup created",
        "  --purge-personal    with --undo, also remove your personal dir",
        "  --refresh-shipped   replace setup's procedure copies from the checkout",
      ].join("\n"),
    );
    return 0;
  }

  const home = expand(values.home ?? homedir(), homedir());
  const root = values.root ? expand(values.root, home) : rootFor(home);
  const personal = expand(values.personal ?? defaultPersonal(home), home);

  const layout: Layout = {
    home,
    root,
    checkout: join(root, "checkout"),
    state: join(root, "state"),
    config: values.config ? expand(values.config, home) : join(root, "thursday.toml"),
    personal,
    procedures: join(personal, "procedures"),
    scratch: join(personal, "scratch"),
    temp: join(tmpdir(), "th-scratch"),
    skillsDirs: (values["skills-dir"] ?? []).map((d) => expand(d, home)),
    manifest: join(root, "state", "install.json"),
    source: values.from ? cloneSource(values.from, home) : REPO,
  };

  // A second harness must add to the list, not replace it. Otherwise installing
  // in OpenCode silently uninstalls Thursday from Command Code.
  if (layout.skillsDirs.length) {
    const previous = await existingSkills(layout.config);
    const merged = [...new Set([...previous, ...layout.skillsDirs])];
    for (const dir of merged.slice(0, merged.length - layout.skillsDirs.length)) {
      console.error(`  keeping ${dir} from the existing install`);
    }
    layout.skillsDirs = merged;
  }

  if (values.json) console.log(JSON.stringify(describe(layout), null, 2));

  if (values.undo) {
    await undo(layout, Boolean(values["dry-run"]), Boolean(values["purge-personal"]));
    return 0;
  }

  if (values["refresh-shipped"]) {
    await refreshShipped(layout, Boolean(values["dry-run"]));
    return 0;
  }

  // The skills dir is the one thing we cannot guess: harnesses disagree and
  // invent new ones. Ask a human, require a script.
  if (!layout.skillsDirs.length) {
    if (values.yes || values["dry-run"]) {
      fail(
        [
          "--skills-dir is required.",
          "",
          "  command code · ~/.commandcode/skills",
          "  claude code  · ~/.claude/skills",
          "  opencode     · ~/.config/opencode/skills",
          "  codex        · ~/.codex/skills",
          "",
          "  anything else · wherever your agent loads skills from",
        ].join("\n"),
        1,
      );
    }

    const answer = await ask(
      "Where does your agent load skills from? (comma-separate for several)",
      "",
    );
    if (!answer) fail("no skills dir given", 1);
    layout.skillsDirs = answer
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => expand(d, home));
  }

  if (!values.personal && !values.yes && !values["dry-run"]) {
    const answer = await ask(
      `Where should your Thursday procedures and notes live?`,
      defaultPersonal(home),
    );
    layout.personal = expand(answer, home);
    layout.procedures = join(layout.personal, "procedures");
    layout.scratch = join(layout.personal, "scratch");
  }

  console.error(`Thursday ${VERSION} · ${process.platform}`);
  await install(layout, Boolean(values["dry-run"]));

  if (!values["dry-run"]) {
    console.error("");
    console.error("  installed. try /thursday in a new session.");
  }

  return 0;
}

if (import.meta.main) {
  process.exit(await main());
}
