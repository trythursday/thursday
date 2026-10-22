const KEYS = {
  baseUrl: "thursday.ai.baseUrl",
  apiKey: "thursday.ai.apiKey",
  model: "thursday.ai.model",
};

export const setBaseUrl = (baseUrl) =>
  localStorage.setItem(KEYS.baseUrl, baseUrl);

export const setApiKey = (apiKey) => localStorage.setItem(KEYS.apiKey, apiKey);

export const setApiEndpoint = (model) =>
  localStorage.setItem(KEYS.model, model);

export const getApiKey = () => localStorage.getItem(KEYS.apiKey);

export const getBaseUrl = () => localStorage.getItem(KEYS.baseUrl);

export const getModel = () => localStorage.getItem(KEYS.model);
