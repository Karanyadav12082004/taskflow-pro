const sql = require("mssql");

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
  },
  pool: {
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
  },
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log("✅ Connected to Azure SQL");
  }
  return pool;
}

async function initDB() {
  const db = await getPool();
  await db.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
    CREATE TABLE users (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      name NVARCHAR(100) NOT NULL,
      email NVARCHAR(200) UNIQUE NOT NULL,
      role NVARCHAR(50) DEFAULT 'member',
      created_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tasks' AND xtype='U')
    CREATE TABLE tasks (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      title NVARCHAR(200) NOT NULL,
      description NVARCHAR(MAX),
      status NVARCHAR(50) DEFAULT 'pending',
      priority NVARCHAR(20) DEFAULT 'medium',
      assigned_to UNIQUEIDENTIFIER REFERENCES users(id),
      due_date DATETIME2,
      tags NVARCHAR(500),
      created_at DATETIME2 DEFAULT GETDATE(),
      updated_at DATETIME2 DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='task_logs' AND xtype='U')
    CREATE TABLE task_logs (
      id INT IDENTITY PRIMARY KEY,
      task_id UNIQUEIDENTIFIER,
      action NVARCHAR(100),
      performed_by NVARCHAR(200),
      details NVARCHAR(MAX),
      logged_at DATETIME2 DEFAULT GETDATE()
    );
  `);
  console.log("✅ Database tables ready");
}

module.exports = { getPool, initDB, sql };
