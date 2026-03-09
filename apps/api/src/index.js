const express = require("express");
const app = express();
app.use(express.json());
const { Pool } = require("pg");
const cors = require("cors");
app.use(cors());
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;

  if (typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = auth.slice("Bearer ".length);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "JWT_SECRET not configured" });
    }

    const payload = jwt.verify(token, secret); // checks signature + exp
    req.user = payload; // ex: { sub, email, role, iat, exp }
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
function isValidRole(role) {
  return role == "student" || role == "ta" || role == "professor";
}

function getAuthContext(req, res) {
  const userId = Number(req.user?.sub);
  const role = req.user?.role;

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({ error: "Invalid token payload (sub)" });
    return null;
  }

  if (typeof role !== "string" || !isValidRole(role)) {
    res.status(401).json({ error: "Invalid token payload (role)" });
    return null;
  }

  return { userId, role };
}

function requireRole(res, role, allowed) {
  if (!allowed.includes(role)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

function threadAccessFilter(role) {
  if (role === "student") return { where: "t.student_id = $1" };
  if (role === "ta") return { where: "t.ta_id = $1" };
  if (role === "professor") return { where: "TRUE" };
  return { where: "FALSE" };
}

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: "ok" });
  } catch (err) {
    res.status(500).json({ ok: false, db: "error" });
  }
});

/*
OLD TEST CODE

app.post("/messages", requireAuth, async (req, res) => {
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

app.get("/messages", requireAuth, async (req, res) => {
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
*/

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

app.post("/auth/signup", async (req, res) => {
  const { email, password, role } = req.body;

  if (typeof email !== "string" || email.trim().length === 0) {
    return res.status(400).json({ error: "email is required" });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "password must be at least 8 chars" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const userRole = (typeof role === "string" ? role : "student").trim();

  if (!isValidRole(userRole)) {
    return res.status(400).json({ error: "invalid role" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const inserted = await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) 
        RETURNING user_id, email, role
        `,
      [normalizedEmail, passwordHash, userRole],
    );

    const user = inserted.rows[0];
    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { id: user.user_id, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err && err.code === "23505") {
      return res.status(409).json({ error: "email already exists" });
    }
    console.error(err);
    return res.status(500).json({ error: "signup failed" });
  }
});

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing. Set it in apps/api/.env");
  }

  return jwt.sign(
    { sub: user.user_id, email: user.email, role: user.role },
    secret,
    { expiresIn: "7d" },
  );
}

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || email.trim().length === 0) {
    return res.status(400).json({ error: "email is required" });
  }

  if (typeof password !== "string" || password.length === 0) {
    return res.status(400).json({ error: "password is required" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const found = await pool.query(
      `SELECT user_id, email, role, password_hash 
        FROM users WHERE email = $1 LIMIT 1`,
      [normalizedEmail],
    );

    if (found.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = found.rows[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: { id: user.user_id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "login failed" });
  }
});

app.get("/threads", requireAuth, async (req, res) => {
  const auth = getAuthContext(req, res);
  if (!auth) return;

  const { where } = threadAccessFilter(auth.role);

  const sql = `
  SELECT t.thread_id, t.title, t.status, t.student_id, t.ta_id
  FROM threads t
  WHERE ${where}
  ORDER BY t.thread_id DESC
  LIMIT 100`;
  const params = where === "TRUE" ? [] : [auth.userId];
  const result = await pool.query(sql, params);

  return res.json({
    threads: result.rows.map((r) => ({
      threadId: r.thread_id,
      title: r.title,
      status: r.status,
      studentId: r.student_id,
      taId: r.ta_id,
    })),
  });
});

app.post("/threads", requireAuth, async (req, res) => {
  const auth = getAuthContext(req, res);
  if (!auth) return;
  if (!requireRole(res, auth.role, ["student"])) return;

  const { title } = req.body;
  if (typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "title is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Prevent two concurrent creates from choosing the same next TA.
    await client.query("SELECT pg_advisory_xact_lock(424242)");

    const tas = await client.query(
      "SELECT user_id FROM users WHERE role = 'ta' ORDER BY user_id ASC",
    );
    if (tas.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(503).json({ error: "No TA available" });
    }

    const lastAssigned = await client.query(
      "SELECT ta_id FROM threads WHERE ta_id IS NOT NULL ORDER BY thread_id DESC LIMIT 1",
    );
    const lastTaId = lastAssigned.rows[0]?.ta_id ?? null;

    let nextTaId = tas.rows[0].user_id;
    if (lastTaId != null) {
      const next = tas.rows.find((r) => r.user_id > lastTaId);
      nextTaId = next ? next.user_id : tas.rows[0].user_id; // wrap-around
    }

    const inserted = await client.query(
      `INSERT INTO threads (student_id, ta_id, title)
       VALUES ($1, $2, $3)
       RETURNING thread_id, title, status, student_id, ta_id`,
      [auth.userId, nextTaId, title.trim()],
    );

    await client.query("COMMIT");

    const t = inserted.rows[0];
    return res.status(201).json({
      thread: {
        threadId: t.thread_id,
        title: t.title,
        status: t.status,
        studentId: t.student_id,
        taId: t.ta_id,
      },
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to create thread" });
  } finally {
    client.release();
  }
});

app.get("/threads/:threadId/messages", requireAuth, async (req, res) => {
  const auth = getAuthContext(req, res);
  if (!auth) return;

  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return res
      .status(400)
      .json({ error: "threadId must be a positive integer" });
  }

  const sinceRaw = req.query.sinceId;
  const sinceNum =
    typeof sinceRaw === "string" && sinceRaw.trim().length > 0
      ? Number(sinceRaw)
      : 0;
  const sinceId = Number.isFinite(sinceNum) && sinceNum > 0 ? sinceNum : 0;

  try {
    const threadResult = await pool.query(
      "SELECT thread_id, student_id, ta_id FROM threads WHERE thread_id = $1 LIMIT 1",
      [threadId],
    );

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const thread = threadResult.rows[0];
    const allowed =
      auth.role === "professor" ||
      (auth.role === "student" && thread.student_id === auth.userId) ||
      (auth.role === "ta" && thread.ta_id === auth.userId);

    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await pool.query(
      `SELECT m.message_id, m.thread_id, m.sender_id, m.content, m.created_at, u.email
       FROM messages m
       JOIN users u ON u.user_id = m.sender_id
       WHERE m.thread_id = $1 AND m.message_id > $2
       ORDER BY m.message_id ASC
       LIMIT 500`,
      [threadId, sinceId],
    );

    return res.json({
      messages: result.rows.map((r) => ({
        messageId: r.message_id,
        threadId: r.thread_id,
        senderId: r.sender_id,
        senderEmail: r.email,
        content: r.content,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch thread messages" });
  }
});

app.post("/threads/:threadId/messages", requireAuth, async (req, res) => {
  const auth = getAuthContext(req, res);
  if (!auth) return;

  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return res
      .status(400)
      .json({ error: "threadId must be a positive integer" });
  }

  const raw =
    typeof req.body?.content === "string"
      ? req.body.content
      : typeof req.body?.text === "string"
        ? req.body.text
        : "";
  const content = String(raw).trim();
  if (content.length === 0) {
    return res.status(400).json({ error: "content is required" });
  }

  try {
    const threadResult = await pool.query(
      "SELECT thread_id, student_id, ta_id FROM threads WHERE thread_id = $1 LIMIT 1",
      [threadId],
    );

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const thread = threadResult.rows[0];
    const allowed =
      auth.role === "professor" ||
      (auth.role === "student" && thread.student_id === auth.userId) ||
      (auth.role === "ta" && thread.ta_id === auth.userId);

    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const inserted = await pool.query(
      `INSERT INTO messages (thread_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING message_id, thread_id, sender_id, content, created_at`,
      [threadId, auth.userId, content],
    );

    const m = inserted.rows[0];
    return res.status(201).json({
      message: {
        messageId: m.message_id,
        threadId: m.thread_id,
        senderId: m.sender_id,
        content: m.content,
        createdAt: m.created_at,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to post thread message" });
  }
});
