// Central Configuration Boundary (Strictly Infrastructure Only)
export interface AppConfig {
  nodeEnv: string;
  port: number;
}

export const appConfig: AppConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
};

// Fail early if structural configurations are completely broken
if (isNaN(appConfig.port)) {
  throw new Error("❌ [CONFIG ERROR]: Invalid port execution parameter assigned.");
}
