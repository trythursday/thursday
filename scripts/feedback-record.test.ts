import { expect, test } from "bun:test";
import { join } from "node:path";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import example from "../examples/feedback-record.json";

const script = join(import.meta.dir, "feedback-record.ts");
const counters = [
  "confirmation_turns", "source_bytes_returned", "truncated_tool_results",
  "repeated_unchanged_reads", "check_runs", "failed_check_runs",
  "expected_red_runs", "input_tokens", "output_tokens",
];

function cli(args: string[], input = "") {
  const result = Bun.spawnSync([process.execPath, "run", script, ...args], {
    stdin: Buffer.from(input),
    env: { PATH: process.env.PATH ?? "" },
  });
  return {
    code: result.exitCode,
    out: new TextDecoder().decode(result.stdout),
    err: new TextDecoder().decode(result.stderr),
  };
}

function template(): Record<string, unknown> {
  const result = cli(["--template"]);
  expect(result.code).toBe(0);
  expect(result.err).toBe("");
  return JSON.parse(result.out);
}

function validate(record: Record<string, unknown>) {
  return cli(["--validate"], JSON.stringify(record));
}

test("template is explicitly synthetic and contains no invented measurements", () => {
  const record = template();
  expect(record.schema_version).toBe(1);
  expect(record.record_kind).toBe("synthetic_example");
  expect(record.verification_boundary).toBe("none");
  expect(record.consumer_verified).toBeNull();
  for (const name of counters) expect(record[name]).toBeNull();
});

test("template validates against the record contract", () => {
  expect(validate(template())).toMatchObject({ code: 0, out: '{"valid":true}\n', err: "" });
  expect(template()).toEqual(example);
});

test("observed zero is distinct from unobserved null", () => {
  const record = template();
  record.record_kind = "observed";
  record.check_runs = 3;
  record.failed_check_runs = 0;
  record.expected_red_runs = 0;
  record.consumer_verified = false;
  record.verification_boundary = "unit_test";
  expect(validate(record).code).toBe(0);
  expect(record.input_tokens).toBeNull();
});

for (const value of [-1, 1.5, "100", true, 9007199254740992]) {
  test(`rejects non-count metric ${JSON.stringify(value)}`, () => {
    const record = template();
    record.source_bytes_returned = value;
    expect(validate(record).code).toBe(1);
  });
}

test("safe integer upper boundary is accepted", () => {
  const record = template();
  record.source_bytes_returned = Number.MAX_SAFE_INTEGER;
  expect(validate(record).code).toBe(0);
});

test("missing observations must be explicit null rather than omitted", () => {
  const record = template();
  delete record.input_tokens;
  expect(validate(record).code).toBe(1);
});

for (const [field, value] of [
  ["schema_version", 2], ["record_kind", "estimate"], ["workflow_mode", "anything"],
  ["verification_boundary", "probably_done"], ["consumer_verified", "yes"],
]) {
  test(`rejects unsupported ${field}`, () => {
    const record = template();
    record[field as string] = value;
    expect(validate(record).code).toBe(1);
  });
}

test("unknown fields cannot carry arbitrary content and are not echoed", () => {
  const record = template();
  record.PRIVATE_FIXTURE = "DO_NOT_ECHO_FIXTURE";
  const result = validate(record);
  expect(result.code).toBe(1);
  expect(result.out + result.err).not.toContain("PRIVATE_FIXTURE");
  expect(result.out + result.err).not.toContain("DO_NOT_ECHO_FIXTURE");
  expect(JSON.parse(result.out).valid).toBe(false);
});

test("invalid known-field content is not echoed", () => {
  const record = template();
  record.record_kind = "DO_NOT_ECHO_FIXTURE";
  const result = validate(record);
  expect(result.code).toBe(1);
  expect(result.out + result.err).not.toContain("DO_NOT_ECHO_FIXTURE");
});

for (const input of ["", "null", "[]", "{DO_NOT_ECHO_FIXTURE", "1"]) {
  test(`rejects non-record input ${JSON.stringify(input)}`, () => {
    const result = cli(["--validate"], input);
    expect(result.code).toBe(1);
    expect(result.out + result.err).not.toContain("DO_NOT_ECHO_FIXTURE");
    expect(JSON.parse(result.out).valid).toBe(false);
  });
}

test("stdin has a byte bound and oversized input is not echoed", () => {
  const result = cli(["--validate"], "DO_NOT_ECHO_FIXTURE".repeat(2000));
  expect(result.code).toBe(1);
  expect(result.out + result.err).not.toContain("DO_NOT_ECHO_FIXTURE");
  expect(JSON.parse(result.out).error).toBe("Input exceeds 16384 bytes");
});

test("input bound includes exactly 16384 bytes but excludes the next byte", () => {
  const record = JSON.stringify(template());
  const exact = record.padEnd(16384, " ");
  expect(cli(["--validate"], exact).code).toBe(0);
  expect(JSON.parse(cli(["--validate"], exact + " ").out).error).toBe("Input exceeds 16384 bytes");
});

test("input bound counts UTF-8 bytes rather than characters", () => {
  const result = cli(["--validate"], "𐍈".repeat(5000));
  expect(result.code).toBe(1);
  expect(JSON.parse(result.out).error).toBe("Input exceeds 16384 bytes");
});

test("template and validation do not create local state", () => {
  const home = mkdtempSync(join(tmpdir(), "thursday-feedback-"));
  try {
    for (const args of [["--template"], ["--validate"]]) {
      const result = Bun.spawnSync([process.execPath, "run", script, ...args], {
        cwd: home,
        stdin: Buffer.from(JSON.stringify(example)),
        // Isolate the tool from Bun's own startup transpiler cache.
        env: { HOME: home, USERPROFILE: home, BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" },
      });
      expect(result.exitCode).toBe(0);
      expect(readdirSync(home)).toEqual([]);
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("unexpected options fail without consuming a session or filename", () => {
  const result = cli(["--template", "--upload"]);
  expect(result.code).toBe(1);
  expect(result.out).toContain("Usage:");
});

for (const prefix of [
  '"check_runs":100,',
  '"\\u0063heck_runs":100,',
  '"workflow_mode":"DO_NOT_ECHO_FIXTURE",',
  '"record_kind":{"nested":1,"nested":2},',
  '"schema_version":1,',
]) {
  test(`rejects ambiguous duplicate JSON fields: ${prefix}`, () => {
    const input = "{" + prefix + JSON.stringify(example).slice(1);
    const result = cli(["--validate"], input);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.out).error).toBe("Input contains duplicate fields");
    expect(result.out + result.err).not.toContain("DO_NOT_ECHO_FIXTURE");
  });
}

test("a unique escaped field name remains valid", () => {
  const input = JSON.stringify(example).replace('"check_runs"', '"\\u0063heck_runs"');
  expect(cli(["--validate"], input).code).toBe(0);
});

test("quoted JSON-looking values are not scanned as field syntax", () => {
  const record = { ...example, record_kind: '{"same":1,"same":2}' };
  const result = validate(record);
  expect(result.code).toBe(1);
  expect(JSON.parse(result.out).error).toBe("Invalid field: record_kind");
});
