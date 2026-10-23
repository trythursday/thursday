import { generate, preload } from "./ai.js";
import { getApiKey, clearStorage } from "./storage.js";

const markedPromise = import("https://esm.sh/marked");

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

const showForm = () => {
  setup.hidden = true;
  form.hidden = false;
};

if (getApiKey()) showForm();

setup.addEventListener("setup-complete", showForm);

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

  try {
    const { marked } = await markedPromise;
    await preload();
    loadingText.textContent = "Loading (Waiting for AI response)";

    await generate({
      goal: goal.value,
      thoughts: thoughts.value,
      onToken: (text) => {
        if (text.trim()) loading.hidden = true;
        output.innerHTML = marked.parse(text);
      },
    });
  } catch (error) {
    const reply =
      error instanceof Response
        ? await error.json().catch(() => null)
        : null;

    output.textContent =
      error?.status === 401
        ? "Your key expired. Clear the AI settings to get a new one."
        : (reply?.error?.message ??
          error?.message ??
          "Something went wrong.");

    output.classList.add("error");
  } finally {
    loading.hidden = true;
    next.disabled = false;
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
