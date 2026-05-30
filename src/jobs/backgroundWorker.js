const cron = require("node-cron");
const { getPool } = require("../config/database");
const logger = require("../middleware/logger");

// Runs every 2 minutes — checks overdue tasks
cron.schedule("*/2 * * * *", async () => {
  logger.info("🔄 Background worker: checking overdue tasks...");
  try {
    const db = await getPool();
    const result = await db.request().query(`
      SELECT COUNT(*) as overdue FROM tasks
      WHERE due_date < GETDATE() AND status NOT IN ('done', 'cancelled')
    `);
    logger.info("✅ Background worker done", {
      overdue_tasks: result.recordset[0].overdue,
    });
  } catch (err) {
    logger.error("❌ Background worker failed", { error: err.message });
  }
});

// Runs every 5 minutes — logs task stats
cron.schedule("*/5 * * * *", async () => {
  logger.info("📊 Background worker: collecting task stats...");
  try {
    const db = await getPool();
    const result = await db.request().query(`
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
    `);
    logger.info("📊 Task stats", { stats: result.recordset });
  } catch (err) {
    logger.error("❌ Stats worker failed", { error: err.message });
  }
});

console.log("✅ Background workers scheduled");
