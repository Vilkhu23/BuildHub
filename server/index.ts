import { createApp } from './app/create-app.js';
import { appConfig } from './config/app-config.js';

const app = createApp();

const server = app.listen(appConfig.port, () => {
  console.log(`\n🚀 BuildEstimate BOS active locally on port: http://localhost:${appConfig.port}`);
});

// Clean Graceful Shutdown Engine Handling
const shutdown = () => {
  console.log("\n🛑 [SHUTDOWN TRIGGERED]: Closing HTTP connections safely...");
  server.close(() => {
    console.log("🏁 [SERVER CLOSED]: Process terminated cleanly.\n");
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
