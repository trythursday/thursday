import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { cloneSource, materializeProcedures } from "./setup.ts";
import { availableRuntimes } from "./test-helpers.ts";

const setup = join(import.meta.dir, "setup.ts");
const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

// Setup is the first thing a user runs: it has to behave the same on both.
for (const runtime of availableRuntimes()) {
  describe(`setup · ${runtime.name}`, () => {
    function preview(source: string, expected: (home: string) => string) {
      const home = mkdtempSync(join(tmpdir(), "thursday-setup-test-"));
      cleanups.push(() => rmSync(home, { recursive: true, force: true }));

      const root = join(home, "install");
      const result = Bun.spawnSync(
        [
          runtime.command,
          ...runtime.run,
          setup,
          "--home",
          home,
          "--root",
          root,
          "--personal",
          join(home, "personal"),
          "--skills-dir",
          join(home, "skills"),
          "--from",
          source,
          "--yes",
          "--dry-run",
          "--json",
        ],
        {
          cwd: home,
          env: {
            PATH: process.env.PATH ?? "",
            HOME: home,
            USERPROFILE: home,
            LOCALAPPDATA: join(home, "appdata"),
            XDG_DATA_HOME: join(home, "data"),
          },
        },
      );

      expect(result.exitCode).toBe(0);
      const layout = JSON.parse(new TextDecoder().decode(result.stdout));
      expect(layout.source).toBe(expected(home));
      expect(existsSync(root)).toBe(false);
      expect(existsSync(join(home, "skills"))).toBe(false);
    }

    for (const source of [
      "https://example.com/team/thursday.git",
      "ssh://git@example.com/team/thursday.git",
      "file:///srv/git/thursday.git",
      "git@example.com:team/thursday.git",
      "github.com:team/thursday.git",
      "example.com:team/thursday.git",
    ]) {
      test(`preserves remote source ${source}`, () => preview(source, () => source));
    }

    test("still resolves relative local sources", () => {
      preview("./local-checkout", (home) => resolve(home, "local-checkout"));
    });

    test("still expands home-relative local sources", () => {
      preview("~/local-checkout", (home) => join(home, "local-checkout"));
    });
  });
}

describe("cloneSource", () => {
  const home = "/home/tester";

  test("leaves every remote form alone", () => {
    for (const remote of [
      "https://example.com/team/thursday.git",
      "http://example.com/team/thursday.git",
      "ssh://git@example.com/team/thursday.git",
      "git+ssh://git@example.com/team/thursday.git",
      "file:///srv/git/thursday.git",
      "git@example.com:team/thursday.git",
      "deploy@example.com:~/thursday.git",
      // scp-style without a user is still a remote, not a local path.
      "github.com:team/thursday.git",
      "example.com:team/thursday.git",
      "foo:thursday.git",
    ]) {
      expect(cloneSource(remote, home)).toBe(remote);
    }
  });

  test("resolves local forms", () => {
    expect(cloneSource("/srv/thursday", home)).toBe(resolve("/srv/thursday"));
    expect(cloneSource("./thursday", home)).toBe(resolve("./thursday"));
    expect(cloneSource("~/thursday", home)).toBe(join(home, "thursday"));
  });

  test("does not mistake a Windows drive for a scheme", () => {
    // A single letter before `:` is a drive, not an RFC 3986 scheme.
    expect(cloneSource("C:\\repos\\thursday", home)).not.toBe("C:\\repos\\thursday");
    expect(cloneSource("C:/repos/thursday", home)).not.toBe("C:/repos/thursday");
  });
});

function shipped() {
  const base = mkdtempSync(join(tmpdir(), "thursday-materialize-"));
  cleanups.push(() => rmSync(base, { recursive: true, force: true }));

  const checkout = join(base, "checkout");
  const procedures = join(base, "personal", "procedures");
  const shipped = join(checkout, "procedures");

  mkdirSync(join(shipped, "skill-examples"), { recursive: true });
  mkdirSync(join(shipped, "migrations"), { recursive: true });
  writeFileSync(join(shipped, "000-th-how-to-talk.md"), "shipped talk\n");
  writeFileSync(join(shipped, "030-th-learn.md"), "shipped learn\n");
  writeFileSync(join(shipped, "skill-examples", "README.md"), "examples\n");
  writeFileSync(join(shipped, "migrations", "0001-setup.md"), "migration\n");

  return { base, checkout, procedures, shipped };
}

describe("materializeProcedures", () => {
  test("copies the shipped set, and not the migrations", async () => {
    const { checkout, procedures } = shipped();

    const counts = await materializeProcedures(checkout, procedures, false);

    expect(counts).toEqual({ copied: 3, kept: 0 });
    expect(readFileSync(join(procedures, "000-th-how-to-talk.md"), "utf8")).toBe(
      "shipped talk\n",
    );
    expect(readFileSync(join(procedures, "skill-examples", "README.md"), "utf8")).toBe(
      "examples\n",
    );
    expect(existsSync(join(procedures, "migrations"))).toBe(false);
  });

  test("keeps a copy that is already there, and is idempotent", async () => {
    const { checkout, procedures } = shipped();
    mkdirSync(procedures, { recursive: true });
    writeFileSync(join(procedures, "000-th-how-to-talk.md"), "my edit\n");

    const first = await materializeProcedures(checkout, procedures, false);
    expect(first).toEqual({ copied: 2, kept: 1 });
    expect(readFileSync(join(procedures, "000-th-how-to-talk.md"), "utf8")).toBe(
      "my edit\n",
    );

    const second = await materializeProcedures(checkout, procedures, false);
    expect(second).toEqual({ copied: 0, kept: 3 });
  });

  test("a dry run writes nothing", async () => {
    const { checkout, procedures } = shipped();

    const counts = await materializeProcedures(checkout, procedures, true);

    expect(counts).toEqual({ copied: 3, kept: 0 });
    expect(existsSync(procedures)).toBe(false);
  });

  test("a checkout with no procedures is not an error", async () => {
    const base = mkdtempSync(join(tmpdir(), "thursday-materialize-"));
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));

    const counts = await materializeProcedures(
      join(base, "nothing-here"),
      join(base, "personal", "procedures"),
      false,
    );

    expect(counts).toEqual({ copied: 0, kept: 0 });
  });
});
