import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { availableRuntimes } from "./test-helpers.ts";

const resolver = join(import.meta.dir, "th-proc.ts");

let base = "";
let personal = "";
let checkout = "";

function setup() {
  base = mkdtempSync(join(tmpdir(), "thursday-proc-"));
  personal = join(base, "personal", "procedures");
  checkout = join(base, "checkout");

  mkdirSync(join(base, "data", "thursday"), { recursive: true });
  writeFileSync(join(base, "data", "thursday", "thursday.toml"), config());

  mkdirSync(join(checkout, "procedures"), { recursive: true });
  writeFileSync(join(checkout, "procedures", "000-th-how-to-talk.md"), "shipped\n");
  writeFileSync(join(checkout, "procedures", "030-th-learn.md"), "shipped\n");

  mkdirSync(personal, { recursive: true });
  writeFileSync(join(personal, "000-th-how-to-talk.md"), "mine\n");
}

const config = () => `[install]
repo = "${checkout}"

[personal]
dir = "${join(base, "personal")}"
procedures = "${personal}"
`;

afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

// The resolver is a user-shipped script: it has to behave the same on both.
for (const runtime of availableRuntimes()) {
  describe(`th-proc · ${runtime.name}`, () => {
    beforeEach(() => {
      setup();
    });

    function run(...args: string[]) {
      const result = Bun.spawnSync(
        [runtime.command, ...runtime.run, resolver, ...args],
        {
          cwd: base,
          env: {
            PATH: process.env.PATH ?? "",
            HOME: base,
            USERPROFILE: base,
            LOCALAPPDATA: join(base, "appdata"),
            XDG_DATA_HOME: join(base, "data"),
          },
        },
      );

      return {
        code: result.exitCode,
        out: new TextDecoder().decode(result.stdout).trim(),
        err: new TextDecoder().decode(result.stderr).trim(),
      };
    }

    test("the personal copy wins", () => {
      const { code, out } = run("000-th-how-to-talk.md");
      expect(code).toBe(0);
      expect(out).toBe(join(personal, "000-th-how-to-talk.md"));
    });

    test("falls back to the checkout when the personal copy is absent", () => {
      const { code, out } = run("030-th-learn.md");
      expect(code).toBe(0);
      expect(out).toBe(join(checkout, "procedures", "030-th-learn.md"));
    });

    test("--json names the source", () => {
      expect(JSON.parse(run("--json", "000-th-how-to-talk.md").out)).toEqual({
        path: join(personal, "000-th-how-to-talk.md"),
        source: "personal",
      });
      expect(JSON.parse(run("--json", "030-th-learn.md").out).source).toBe("checkout");
    });

    test("--list reports one source per name", () => {
      const { code, out } = run("--list");
      expect(code).toBe(0);
      expect(out.split("\n")).toEqual([
        `000-th-how-to-talk.md\tpersonal`,
        `030-th-learn.md\tcheckout`,
      ]);
    });

    test("a missing procedure exits 1 and names both places", () => {
      const { code, out, err } = run("999-th-nothing.md");
      expect(code).toBe(1);
      expect(out).toBe("");
      expect(err).toContain("999-th-nothing.md");
      expect(err).toContain(personal);
      expect(err).toContain(join(checkout, "procedures"));
    });

    test("a path is refused instead of resolved", () => {
      const { code, err } = run("../thursday.toml");
      expect(code).toBe(2);
      expect(err).toContain("not a procedure name");
    });

    test("no name is a usage error", () => {
      const { code } = run();
      expect(code).toBe(2);
    });

    test("no config is exit 2, not a guess", () => {
      rmSync(join(base, "data", "thursday", "thursday.toml"));
      const { code, err } = run("000-th-how-to-talk.md");
      expect(code).toBe(2);
      expect(err).toContain("not set up");
    });

    test("a config without install.repo is exit 2", () => {
      writeFileSync(
        join(base, "data", "thursday", "thursday.toml"),
        config().replace(/repo = .*\n/, ""),
      );
      const { code, err } = run("000-th-how-to-talk.md");
      expect(code).toBe(2);
      expect(err).toContain("no [install].repo");
    });

    test("nothing is created or modified by resolving", () => {
      run("000-th-how-to-talk.md");
      run("--list");
      expect(existsSync(join(base, "personal", "procedures", "030-th-learn.md"))).toBe(false);
    });
  });
}
