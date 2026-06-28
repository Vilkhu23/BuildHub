import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import aiRouter from "./routes/ai";
import dbRouter from "./routes/db";

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Mount API routers
  app.use("/api/db", dbRouter);
  app.use("/api", aiRouter);

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BuildEstimate BOS running at http://localhost:${PORT}`);
  });
}

startServer();
