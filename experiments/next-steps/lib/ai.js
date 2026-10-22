import { getApiKey, getBaseUrl, getModel } from "./storage.js";

const SYSTEM_PROMPT_URL = new URL("../SYSTEM-PROMPT.md", import.meta.url);

let systemPrompt;

async function loadSystemPrompt() {
  if (!systemPrompt) {
    systemPrompt = await (await fetch(SYSTEM_PROMPT_URL)).text();
  }
  return systemPrompt;
}

export async function generate({ goal, thoughts, onToken }) {
  const { default: OpenAI } = await import("https://esm.sh/openai@7.42.0");

  const client = new OpenAI({
    apiKey: getApiKey(),
    baseURL: getBaseUrl(),
    dangerouslyAllowBrowser: true,
  });

  const stream = await client.chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: await loadSystemPrompt() },
      { role: "user", content: `Goal: ${goal}\n\nThoughts:\n${thoughts}` },
    ],
    stream: true,
  });

  let text = "";

  for await (const chunk of stream) {
    text += chunk.choices[0]?.delta?.content ?? "";
    onToken?.(text);
  }

  return text;
}
