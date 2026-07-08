import dotenv from "dotenv";
dotenv.config();

export interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  GEMINI_API_KEY?: string;
  APP_URL?: string;
}

export function validateEnv(): EnvConfig {
  const portStr = process.env.PORT || "3000";
  const PORT = parseInt(portStr, 10);
  if (isNaN(PORT)) {
    throw new Error(`Invalid PORT configured: ${portStr}`);
  }

  const NODE_ENV = process.env.NODE_ENV || "development";

  return {
    PORT,
    NODE_ENV,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    APP_URL: process.env.APP_URL,
  };
}

export const env = validateEnv();
