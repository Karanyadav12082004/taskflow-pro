const express = require("express");
const router = express.Router();
const { getPool } = require("../config/database");
const os = require("os");

router.get("/live", (req, res) => {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
});

router.get("/ready", async (req, res) => {
  try {
    const db = await getPool();
    await db.request().query("SELECT 1 AS check_val");
    res.json({
      status: "ready",
      db: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ status: "not_ready", error: err.message });
  }
});

router.get("/metrics", (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    uptime_seconds: process.uptime(),
    memory: {
      rss_mb: (mem.rss / 1024 / 1024).toFixed(2),
      heap_used_mb: (mem.heapUsed / 1024 / 1024).toFixed(2),
      heap_total_mb: (mem.heapTotal / 1024 / 1024).toFixed(2),
    },
    cpu_count: os.cpus().length,
    load_avg: os.loadavg(),
    platform: process.platform,
    node_version: process.version,
    env: process.env.NODE_ENV,
  });
});

module.exports = router;
