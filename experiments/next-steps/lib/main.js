import { generate, preload } from "./ai.js";
import { getApiKey, clearStorage } from "./storage.js";
import { isFreeKey, keyExpiry } from "./ai-for-all-client.js";

const micromarkPromise = import("https://esm.sh/micromark@4");

const setup = document.querySelector("ai-setup");
const root = document.querySelector("#root");
const form = document.querySelector("#form");
const result = document.querySelector("#result");
const output = result.querySelector(".result");
const next = document.querySelector("#next");
const back = document.querySelector("#back");
const random = document.querySelector("#random");
const loading = result.querySelector(".loading");
const loadingText = result.querySelector(".loading-text");

let latest = "";
let shown = "";
let frame = 0;
let parse = () => "";

const paint = () => {
  if (frame) return;

  frame = requestAnimationFrame(() => {
    frame = 0;

    if (latest === shown) return;

    shown = latest;
    output.innerHTML = parse(latest);
  });
};

const showForm = () => {
  setup.hidden = true;
  form.hidden = false;
};

const provider = document.querySelector("#provider");
const providerNote = provider.querySelector(".note");

const formatRemaining = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (!hours) return `${minutes}m`;

  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

const renderProvider = () => {
  const apiKey = getApiKey();

  providerNote.hidden = !apiKey;

  if (!apiKey) return;

  if (!isFreeKey(apiKey)) {
    providerNote.textContent = "Using a custom AI provider";
    return;
  }

  const expiry = keyExpiry(apiKey);

  providerNote.textContent =
    expiry && expiry > Date.now()
      ? `Using AI For All, access expires in ${formatRemaining(expiry - Date.now())}`
      : "Using AI For All, access has expired";
};

renderProvider();
setInterval(renderProvider, 30_000);

if (getApiKey()) showForm();

setup.addEventListener("setup-complete", () => {
  renderProvider();
  showForm();
});

const goal = document.querySelector("#goal");
const hintRow = document.querySelector(".hint-row");

const HINTS = [
  "quit my job",
  "be a dinosaur",
  "solve world hunger",
  "fly a plane",
  "get into a relationship",
  "start exercising",
  "be a better person",
  "improve my focus",
  "write a book",
  "learn to code",
  "write the perfect resume",
];

for (const hint of [...HINTS].sort(() => Math.random() - 0.5).slice(0, 3)) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = `...${hint}`;
  button.addEventListener("click", () => {
    goal.value = `I want to ${hint}`;
  });
  hintRow.append(button);
}

const thoughts = document.querySelector("#thoughts");

let examples;

const loadExamples = async () => {
  if (!examples) {
    const { parse } = await import("https://esm.sh/smol-toml");
    const text = await (await fetch("./static/EXAMPLES.toml")).text();
    examples = parse(text).examples;
  }
  return examples;
};

random.addEventListener("click", async () => {
  const all = await loadExamples();
  const example = all[Math.floor(Math.random() * all.length)];

  goal.value = example.goal;
  thoughts.value = example.thoughts;
});

next.addEventListener("click", async () => {
  form.hidden = true;
  result.hidden = false;
  output.textContent = "";
  output.classList.remove("error");
  next.disabled = true;
  loading.hidden = false;
  loadingText.textContent = "Loading (Connecting to AI provider)";

  latest = "";
  shown = "";

  try {
    const { micromark } = await micromarkPromise;
    parse = micromark;
    await preload();
    loadingText.textContent = "Loading (Waiting for AI response)";

    await generate({
      goal: goal.value,
      thoughts: thoughts.value,
      onToken: (text) => {
        if (text.trim()) loading.hidden = true;
        latest = text;
        paint();
      },
    });
  } catch (error) {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    const reply =
      error instanceof Response
        ? await error.json().catch(() => null)
        : null;

    const apiKey = getApiKey();
    const expiry = keyExpiry(apiKey);

    // A free key with no readable expiry predates signed keys, so it is dead.
    const expired = isFreeKey(apiKey) && !(expiry > Date.now());

    output.textContent =
      expired
        ? "Your free key expired. Clear the AI settings to get a new one."
        : error?.status === 401
          ? "That key was rejected. Clear the AI settings to enter another."
          : (reply?.error?.message ??
            error?.message ??
            "Something went wrong.");

    output.classList.add("error");
  } finally {
    loading.hidden = true;
    next.disabled = false;
    renderProvider();
  }
});

back.addEventListener("click", () => {
  result.hidden = true;
  form.hidden = false;
});

const clearSettings = document.querySelector("#clear-settings");

clearSettings.addEventListener("click", async (event) => {
  event.preventDefault();

  const { confirm } = await import("https://esm.sh/cf-alert");
  const confirmed = await confirm(
    "This deletes the saved API key, base URL and model.",
    { yes: "Clear", no: "Cancel" },
    "Clear AI settings?",
  );

  if (!confirmed) return;

  clearStorage();
  location.reload();
});

preload();

root.hidden = false;
