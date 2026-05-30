if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const { setupAppInsights } = require("./src/config/appInsights");

setupAppInsights();

const app = require("./src/app");
const { initDB } = require("./src/config/database");
require("./src/jobs/backgroundWorker");

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`🚀 TaskFlow Pro running on port ${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health/live`);
      console.log(`📊 Metrics:      http://localhost:${PORT}/health/metrics`);
      console.log(`✅ Tasks API:    http://localhost:${PORT}/api/tasks`);
    });
  } catch (err) {
    console.error("❌ Failed to start:", err.message);
    process.exit(1);
  }
}

start();
