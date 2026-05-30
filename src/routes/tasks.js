const express = require("express");
const router = express.Router();
const { getPool, sql } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const logger = require("../middleware/logger");

// GET all tasks with filters + pagination
router.get("/", async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const db = await getPool();
    const request = db.request();
    request.input("offset", sql.Int, parseInt(offset));
    request.input("limit", sql.Int, parseInt(limit));

    let where = "WHERE 1=1";
    if (status) {
      request.input("status", sql.NVarChar, status);
      where += " AND t.status = @status";
    }
    if (priority) {
      request.input("priority", sql.NVarChar, priority);
      where += " AND t.priority = @priority";
    }

    const result = await request.query(`
      SELECT t.*, u.name as assigned_user_name, u.email as assigned_user_email,
        (SELECT COUNT(*) FROM task_logs tl WHERE tl.task_id = t.id) as log_count
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      ${where}
      ORDER BY t.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const countResult = await db.request().query(
      `SELECT COUNT(*) as total FROM tasks`
    );

    res.json({
      data: result.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.recordset[0].total,
      },
    });
  } catch (err) {
    logger.error("GET /tasks error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET single task by id
router.get("/:id", async (req, res) => {
  try {
    const db = await getPool();
    const result = await db.request()
      .input("id", sql.UniqueIdentifier, req.params.id)
      .query(`
        SELECT t.*, u.name as assigned_user_name, u.email as assigned_user_email
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.id = @id
      `);
    if (result.recordset.length === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json(result.recordset[0]);
  } catch (err) {
    logger.error("GET /tasks/:id error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST create task
router.post("/", async (req, res) => {
  try {
    const { title, description, priority, assigned_to, due_date, tags } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const db = await getPool();
    const id = uuidv4();

    await db.request()
      .input("id", sql.UniqueIdentifier, id)
      .input("title", sql.NVarChar, title)
      .input("description", sql.NVarChar, description || null)
      .input("priority", sql.NVarChar, priority || "medium")
      .input("assigned_to", sql.UniqueIdentifier, assigned_to || null)
      .input("due_date", sql.DateTime2, due_date ? new Date(due_date) : null)
      .input("tags", sql.NVarChar, tags ? JSON.stringify(tags) : null)
      .query(`
        INSERT INTO tasks (id, title, description, priority, assigned_to, due_date, tags)
        VALUES (@id, @title, @description, @priority, @assigned_to, @due_date, @tags)
      `);

    // Log the action
    await db.request()
      .input("task_id", sql.UniqueIdentifier, id)
      .input("action", sql.NVarChar, "CREATED")
      .input("performed_by", sql.NVarChar, req.headers["x-user-email"] || "system")
      .input("details", sql.NVarChar, JSON.stringify(req.body))
      .query(`
        INSERT INTO task_logs (task_id, action, performed_by, details)
        VALUES (@task_id, @action, @performed_by, @details)
      `);

    logger.info("Task created", { taskId: id, title });
    res.status(201).json({ id, message: "Task created successfully" });
  } catch (err) {
    logger.error("POST /tasks error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// PUT update task
router.put("/:id", async (req, res) => {
  try {
    const { title, description, status, priority, due_date, tags } = req.body;
    const db = await getPool();

    await db.request()
      .input("id", sql.UniqueIdentifier, req.params.id)
      .input("title", sql.NVarChar, title || null)
      .input("description", sql.NVarChar, description || null)
      .input("status", sql.NVarChar, status || null)
      .input("priority", sql.NVarChar, priority || null)
      .input("due_date", sql.DateTime2, due_date ? new Date(due_date) : null)
      .input("tags", sql.NVarChar, tags ? JSON.stringify(tags) : null)
      .query(`
        UPDATE tasks SET
          title = COALESCE(@title, title),
          description = COALESCE(@description, description),
          status = COALESCE(@status, status),
          priority = COALESCE(@priority, priority),
          due_date = COALESCE(@due_date, due_date),
          tags = COALESCE(@tags, tags),
          updated_at = GETDATE()
        WHERE id = @id
      `);

    // Log the update
    await db.request()
      .input("task_id", sql.UniqueIdentifier, req.params.id)
      .input("action", sql.NVarChar, "UPDATED")
      .input("performed_by", sql.NVarChar, req.headers["x-user-email"] || "system")
      .input("details", sql.NVarChar, JSON.stringify(req.body))
      .query(`
        INSERT INTO task_logs (task_id, action, performed_by, details)
        VALUES (@task_id, @action, @performed_by, @details)
      `);

    logger.info("Task updated", { taskId: req.params.id });
    res.json({ message: "Task updated successfully" });
  } catch (err) {
    logger.error("PUT /tasks/:id error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// DELETE task
router.delete("/:id", async (req, res) => {
  try {
    const db = await getPool();
    await db.request()
      .input("id", sql.UniqueIdentifier, req.params.id)
      .query("DELETE FROM tasks WHERE id = @id");

    logger.info("Task deleted", { taskId: req.params.id });
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    logger.error("DELETE /tasks/:id error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET task logs
router.get("/:id/logs", async (req, res) => {
  try {
    const db = await getPool();
    const result = await db.request()
      .input("id", sql.UniqueIdentifier, req.params.id)
      .query(`
        SELECT * FROM task_logs
        WHERE task_id = @id
        ORDER BY logged_at DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET report summary
router.get("/report/summary", async (req, res) => {
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

module.exports = router;
