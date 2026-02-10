const express = require("express");
const app = express();
app.use(express.json());
const { Pool } = require("pg");
const cors = require("cors");
app.use(cors());

const dotenv = require("dotenv");
dotenv.config();

const PORT = Number(process.env.PORT) || 3001;

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

function normalizeEmail(sender) {
  const s = String(sender || "")
    .trim()
    .toLowerCase();
  if (s.includes("@")) return s;
  // Dev-only convention for demo senders like "student1"
  return `${s}@local.test`;
}

async function getOrCreateUserId(sender) {
  const email = normalizeEmail(sender);
  const passwordHash = "dev";
  const role = "student";

  const result = await pool.query(
    `WITH ins AS (
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING
      RETURNING user_id
    )
    SELECT user_id FROM ins
    UNION ALL
    SELECT user_id FROM users WHERE email = $1
    LIMIT 1;`,
    [email, passwordHash, role],
  );

  return result.rows[0]?.user_id;
}

async function getOrCreateThreadId(threadTitle, studentId) {
  const title = String(threadTitle || "").trim();
  const existing = await pool.query(
    "SELECT thread_id FROM threads WHERE title = $1 ORDER BY thread_id ASC LIMIT 1",
    [title],
  );

  if (existing.rows.length > 0) return existing.rows[0].thread_id;

  const inserted = await pool.query(
    "INSERT INTO threads (student_id, title) VALUES ($1, $2) RETURNING thread_id",
    [studentId, title],
  );
  return inserted.rows[0].thread_id;
}

testDbConnection();

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: "ok" });
  } catch (err) {
    res.status(500).json({ ok: false, db: "error" });
  }
});

app.post("/messages", async (req, res) => {
  const { threadId, sender, text } = req.body;

  if (!threadId || typeof threadId !== "string") {
    return res.status(400).json({ error: "threadId (string) is required" });
  }

  if (!sender || typeof sender !== "string") {
    return res.status(400).json({ error: "sender (string) is required" });
  }

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text (string) is required" });
  }

  try {
    const senderId = await getOrCreateUserId(sender);
    if (!senderId) {
      return res.status(500).json({ error: "Failed to resolve sender" });
    }

    const dbThreadId = await getOrCreateThreadId(threadId, senderId);

    const inserted = await pool.query(
      "INSERT INTO messages (thread_id, sender_id, content) VALUES ($1, $2, $3) RETURNING message_id, thread_id, sender_id, content, created_at",
      [dbThreadId, senderId, text],
    );

    const row = inserted.rows[0];
    res.status(201).json({
      id: row.message_id,
      threadId,
      sender,
      text: row.content,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to post message" });
  }
});

app.get("/messages", async (req, res) => {
  const { threadId, sinceId } = req.query;

  if (typeof threadId !== "string" || threadId.trim().length === 0) {
    return res.status(400).json({ error: "threadId (string) is required" });
  }

  const since =
    typeof sinceId === "string" && sinceId.length > 0 ? Number(sinceId) : 0;
  const sinceMessageId = Number.isFinite(since) && since > 0 ? since : 0;

  try {
    const threadResult = await pool.query(
      "SELECT thread_id FROM threads WHERE title = $1 ORDER BY thread_id ASC LIMIT 1",
      [threadId.trim()],
    );
    if (threadResult.rows.length === 0) return res.json([]);

    const dbThreadId = threadResult.rows[0].thread_id;

    const rows = await pool.query(
      `SELECT m.message_id, m.content, m.created_at, u.email
       FROM messages m
       JOIN users u ON u.user_id = m.sender_id
       WHERE m.thread_id = $1 AND m.message_id > $2
       ORDER BY m.message_id ASC`,
      [dbThreadId, sinceMessageId],
    );

    const result = rows.rows.map((r) => ({
      id: r.message_id,
      threadId: threadId.trim(),
      sender: String(r.email || ""),
      text: r.content,
      createdAt: r.created_at,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
