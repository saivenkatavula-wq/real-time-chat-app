import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

let genAIClient = null;

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured");
  }

  if (!genAIClient) {
    genAIClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  return genAIClient;
};

export const getGeminiModel = (modelName = DEFAULT_MODEL) => {
  const client = getClient();
  return client.getGenerativeModel({ model: modelName });
};

export const isGeminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

export const getModelFallbackOrder = () => {
  const candidates = [
    process.env.GEMINI_MODEL,
    "models/gemini-1.5-flash-latest",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro-latest",
    "models/gemini-1.5-pro",
    "models/gemini-pro",
  ];

  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!candidate || seen.has(candidate)) return false;
    seen.add(candidate);
    return true;
  });
};
