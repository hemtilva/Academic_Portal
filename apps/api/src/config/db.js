const { Pool } = require("pg");

const useSsl = String(process.env.DB_SSL || "").toLowerCase() === "true";

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });

async function testDbConnection() {
  try {
    await pool.query("SELECT 1 AS ok");
    console.log("Connected to the database");
  } catch (err) {
    console.error("Database connection error:", err);
  }
}

async function ensureMessageColumns() {
  try {
    await pool.query(
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ",
    );
    await pool.query(
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ",
    );
  } catch (err) {
    // If messages table doesn't exist yet, ignore (schema.sql will create it).
    console.error("Failed ensuring message columns:", err);
  }
}

module.exports = {
  pool,
  testDbConnection,
  ensureMessageColumns,
};
