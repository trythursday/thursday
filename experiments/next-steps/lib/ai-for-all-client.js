export const API_BASE = "https://ai-for-all.trythursday.org";

// A key is the prefix, then the expiry in base36 seconds, then a signature.
// Only the expiry is readable without the server secret.
const PREFIX = "sk-th-";
const EXPIRY_CHARS = 7;
const KEY_CHARS = EXPIRY_CHARS + 16;

export const isFreeKey = (apiKey) => apiKey?.startsWith(PREFIX) ?? false;

export function keyExpiry(apiKey) {
  if (!isFreeKey(apiKey)) return null;

  const body = apiKey.slice(PREFIX.length);

  if (body.length !== KEY_CHARS) return null;

  const seconds = Number.parseInt(body.slice(0, EXPIRY_CHARS), 36);

  return Number.isSafeInteger(seconds) ? new Date(seconds * 1_000) : null;
}

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@cap.js/wasm@0.0.8/browser/cap_wasm.js";

function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function fnv1aResume(state, str) {
  let h = state;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

function prng(state, length) {
  let result = "";
  while (result.length < length) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    result += state.toString(16).padStart(8, "0");
  }
  return result.slice(0, length);
}

let solvePow;

async function loadSolver() {
  if (solvePow) return solvePow;

  try {
    const wasm = await import(WASM_URL);
    await wasm.default();
    solvePow = wasm.solve_pow;
  } catch {
    throw new Error(
      "Could not load the proof-of-work solver. Check your connection and try again.",
    );
  }

  return solvePow;
}

// capjs-core derives a salt and a target per challenge from the token. The wasm
// module only finds the nonce for one salt/target pair, so the loop is here.
async function solve(token, { c, s, d }, onProgress) {
  const findNonce = await loadSolver();
  const tokenHash = fnv1a(token);
  const solutions = [];

  for (let i = 0; i < c; i++) {
    const saltSeed = fnv1aResume(tokenHash, String(i + 1));
    const salt = prng(saltSeed, s);
    const target = prng(fnv1aResume(saltSeed, "d"), d);

    solutions.push(Number(findNonce(salt, target)));

    if (i % 5 === 0 || i === c - 1) {
      onProgress((i + 1) / c);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return solutions;
}

async function post(path, body, rateMessage) {
  const response = await fetch(API_BASE + path, {
    method: "POST",
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const reply = await response.json().catch(() => null);

  if (response.status === 429) throw new Error(rateMessage);

  if (!response.ok || !reply?.ok) {
    throw new Error(
      reply?.error?.message ?? "The server rejected the request.",
    );
  }

  return reply;
}

export async function getFreeKey(onProgress) {
  const challenge = await post(
    "/api/v1/issue/challenge",
    undefined,
    "A challenge was issued in the past minute. Wait a minute and try again.",
  );

  const { c, s, d } = challenge.payload.challenge;
  const { token } = challenge.payload;

  const solutions = await solve(token, { c, s, d }, onProgress);

  const issued = await post(
    "/api/v1/issue",
    { token, solutions },
    "A key was issued from this IP in the past 10 minutes. Try again shortly.",
  );

  return issued.payload.apiKey;
}
