import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import aiRouter from "../routes/ai";
import dbRouter from "../routes/db";
import healthRouter from "../modules/health/health.routes.js";
import { AppError } from "../core/errors/app-error.js";
import { appConfig } from "../config/app-config.js";

export function createApp() {
  const app = express();
  app.use(express.json());

  // Request Correlation ID Middleware Engine
  app.use((req: any, res, next) => {
    const reqId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
    req.requestId = reqId;
    res.setHeader("x-request-id", reqId);
    next();
  });

  // Module Registration Matrix Boundary
  app.use("/api/db", dbRouter);
  app.use("/api", aiRouter);
  app.use("/api", healthRouter);

  // New API JSON 404 Route Handler Fallback
  app.use("/api/*", (req: any, res) => {
    res.status(404).json({
      success: false,
      error: { code: "RESOURCE_NOT_FOUND", message: "API Route not found." },
      requestId: req.requestId
    });
  });

  // Vite Integration (Asynchronous load within synchronous setup wrapper)
  if (appConfig.nodeEnv !== "production") {
    let viteMiddleware: express.RequestHandler | null = null;
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      viteMiddleware = vite.middlewares;
    }).catch((err) => {
      console.error("Vite server error:", err);
    });

    app.use((req, res, next) => {
      if (viteMiddleware) {
        viteMiddleware(req, res, next);
      } else {
        next();
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Centralized Error Handling Matrix
  app.use((err: any, req: any, res: any, next: any) => {
    const requestId = req.requestId || "unknown";
    
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
        requestId
      });
    }

    // Shield internal exceptions from client view
    console.error(`[Error] Request ID: ${requestId} - Message:`, err);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "An unexpected server failure occurred." },
      requestId
    });
  });

  return app;
}
