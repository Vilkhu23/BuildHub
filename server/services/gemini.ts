import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined. AI features will run in mock mode.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateContentWithRetry(params: {
  model: string;
  contents: any;
  config?: any;
}) {
  const ai = getGeminiClient();
  const maxRetries = 2;
  const backoffDelays = [2500, 5000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      // Check if it is a transient/overloaded/503/429 error
      const errStr = String(error?.message || error).toUpperCase();
      const errStatus = error?.status || "";
      const errCode = error?.code || 0;

      const isTransient = 
        errStatus === "UNAVAILABLE" || 
        errCode === 503 || 
        errCode === 429 ||
        errStr.includes("503") || 
        errStr.includes("429") || 
        errStr.includes("UNAVAILABLE") || 
        errStr.includes("HIGH DEMAND") || 
        errStr.includes("RESOURCE_EXHAUSTED") || 
        errStr.includes("SPIKES IN DEMAND") || 
        errStr.includes("TEMPORARY");

      if (isTransient && attempt < maxRetries) {
        const delay = backoffDelays[attempt];
        console.warn(`[Gemini API] Transient warning (${error.message || error}). Retrying attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // If we exhausted retries on the main model, try falling back to 'gemini-3.1-flash-lite'
      if (params.model !== "gemini-3.1-flash-lite") {
        console.warn(`[Gemini API] Model ${params.model} busy. Falling back to gemini-3.1-flash-lite...`);
        try {
          return await ai.models.generateContent({
            ...params,
            model: "gemini-3.1-flash-lite"
          });
        } catch (fallbackError: any) {
          console.warn("[Gemini API] Fallback model gemini-3.1-flash-lite handled:", fallbackError?.message || fallbackError);
        }
      }
      
      throw error;
    }
  }
  throw new Error("Failed to generate content after retries");
}
