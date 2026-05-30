const express = require("express");
const router = express.Router();
const { getPool, sql } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const logger = require("../middleware/logger");

router.get("/", async (req, res) => {
  try {
    const db = await getPool();
    const result = await db.request().query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(result.recordset);
  } catch (err) {
    logger.error("GET /users error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email required" });
    const db = await getPool();
    const id = uuidv4();
    await db.request()
      .input("id", sql.UniqueIdentifier, id)
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, role || "member")
      .query("INSERT INTO users (id,name,email,role) VALUES (@id,@name,@email,@role)");
    logger.info("User created", { userId: id, email });
    res.status(201).json({ id, message: "User created" });
  } catch (err) {
    logger.error("POST /users error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = await getPool();
    await db.request()
      .input("id", sql.UniqueIdentifier, req.params.id)
      .query("DELETE FROM users WHERE id=@id");
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
