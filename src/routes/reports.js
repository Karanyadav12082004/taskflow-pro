const express = require("express");
const router = express.Router();
const { getPool } = require("../config/database");

router.get("/summary", async (req, res) => {
  try {
    const db = await getPool();
    const result = await db.request().query(`
      SELECT
        status, priority,
        COUNT(*) as count,
        COUNT(DISTINCT assigned_to) as unique_assignees,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM tasks
      GROUP BY status, priority
      ORDER BY status, priority
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/user-workload", async (req, res) => {
  try {
    const db = await getPool();
    const result = await db.request().query(`
      SELECT u.name, u.email,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) as done
      FROM users u
      LEFT JOIN tasks t ON t.assigned_to = u.id
      GROUP BY u.name, u.email
      ORDER BY total_tasks DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
