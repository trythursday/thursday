#!/usr/bin/env bun
// An opt-in template/validator, not a session collector or uploader.
import schema from "../schemas/feedback-record.schema.json";

const MAX_BYTES = 16_384;
const TOO_LARGE = `Input exceeds ${MAX_BYTES} bytes`;
const USAGE = "Usage: bun run scripts/feedback-record.ts --template | --validate | --help";

type Rule = {
  const?: unknown;
  enum?: unknown[];
  type?: string[];
  minimum?: number;
  maximum?: number;
  default: unknown;
};
const properties = schema.properties as Record<string, Rule>;

// This handles this versioned flat schema, not arbitrary JSON Schema documents.
function recordError(value: unknown): string | null {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return "Expected a record object";
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !Object.hasOwn(properties, key)))
    return "Unexpected field";
  for (const key of schema.required) {
    if (!Object.hasOwn(record, key)) return `Missing field: ${key}`;
  }
  for (const [key, rule] of Object.entries(properties)) {
    const item = record[key];
    let valid = false;
    if (Object.hasOwn(rule, "const")) valid = item === rule.const;
    else if (rule.enum) valid = rule.enum.includes(item);
    else if (item === null) valid = rule.type?.includes("null") ?? false;
    else if (typeof item === "boolean") valid = rule.type?.includes("boolean") ?? false;
    else if (typeof item === "number" && rule.type?.includes("integer")) {
      valid = Number.isSafeInteger(item)
        && item >= (rule.minimum ?? -Infinity)
        && item <= (rule.maximum ?? Infinity);
    }
    if (!valid) return `Invalid field: ${key}`;
  }
  return null;
}

// Run only after JSON.parse succeeds: token boundaries and nesting are valid.
function hasDuplicateFields(input: string): boolean {
  const objects: Set<string>[] = [];
  let i = 0;
  while (i < input.length) {
    const char = input[i];
    if (char === "{") objects.push(new Set());
    else if (char === "}") objects.pop();
    else if (char === '\"') {
      const start = i++;
      while (input[i] !== '\"') {
        i += input[i] === "\\" ? 2 : 1;
      }
      i++;
      let next = i;
      while (/\s/.test(input[next] ?? "") && next < input.length) next++;
      if (input[next] === ":") {
        const key: string = JSON.parse(input.slice(start, i));
        const keys = objects.at(-1)!;
        if (keys.has(key)) return true;
        keys.add(key);
      }
      continue;
    }
    i++;
  }
  return false;
}

async function readInput(): Promise<string> {
  const reader = Bun.stdin.stream().getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel().catch(() => {});
        throw new Error(TOO_LARGE);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
}

async function main(args: string[]): Promise<number> {
  if (args.length !== 1 || !["--template", "--validate", "--help"].includes(args[0])) {
    console.log(USAGE);
    return 1;
  }
  if (args[0] === "--help") {
    console.log(USAGE);
    return 0;
  }
  if (args[0] === "--template") {
    const template = Object.fromEntries(Object.entries(properties).map(([key, rule]) => [key, rule.default]));
    console.log(JSON.stringify(template, null, 2));
    return 0;
  }
  let error: string | null;
  try {
    const input = await readInput();
    const parsed: unknown = JSON.parse(input);
    error = hasDuplicateFields(input) ? "Input contains duplicate fields" : recordError(parsed);
  } catch (cause) {
    error = cause instanceof Error && cause.message === TOO_LARGE ? TOO_LARGE : "Input is not valid JSON";
  }
  console.log(JSON.stringify(error ? { valid: false, error } : { valid: true }));
  return error ? 1 : 0;
}

if (import.meta.main) process.exitCode = await main(Bun.argv.slice(2));
