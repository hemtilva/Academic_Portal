const express = require("express");

function createThreadsRouter({
  pool,
  requireAuth,
  getAuthContext,
  requireRole,
  requireCourseMember,
  threadAccessFilter,
}) {
  const router = express.Router();

  router.get("/threads", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    const courseCtx = await requireCourseMember(pool, req, res, auth);
    if (!courseCtx) return;

    const { where } = threadAccessFilter(courseCtx.role);

    const sql = `
      SELECT t.thread_id, t.course_id, t.title, t.status, t.student_id, t.ta_id,
        COALESCE(t.is_escalated_to_professor, FALSE) AS is_escalated_to_professor,
        t.escalated_at,
        s.email AS student_email,
        ta.email AS ta_email
      FROM threads t
      JOIN users s ON s.user_id = t.student_id
      LEFT JOIN users ta ON ta.user_id = t.ta_id
      WHERE t.course_id = $1 AND (${where.replaceAll("$1", "$2")})
      ORDER BY t.thread_id DESC
      LIMIT 100`;

    const params = String(where).includes("$1")
      ? [courseCtx.courseId, auth.userId]
      : [courseCtx.courseId];

    const result = await pool.query(sql, params);

    return res.json({
      threads: result.rows.map((r) => ({
        threadId: r.thread_id,
        courseId: r.course_id,
        title: r.title,
        status: r.status,
        studentId: r.student_id,
        taId: r.ta_id,
        isEscalatedToProfessor: r.is_escalated_to_professor,
        escalatedAt: r.escalated_at,
        studentEmail: r.student_email,
        taEmail: r.ta_email,
      })),
    });
  });

  router.patch("/threads/:threadId/escalate", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    const courseCtx = await requireCourseMember(pool, req, res, auth);
    if (!courseCtx) return;
    if (!requireRole(res, courseCtx.role, ["student"])) return;

    const threadId = Number(req.params.threadId);
    if (!Number.isInteger(threadId) || threadId <= 0) {
      return res
        .status(400)
        .json({ error: "threadId must be a positive integer" });
    }

    try {
      const found = await pool.query(
        "SELECT thread_id, student_id, status FROM threads WHERE thread_id = $1 AND course_id = $2 LIMIT 1",
        [threadId, courseCtx.courseId],
      );

      if (found.rows.length === 0) {
        return res.status(404).json({ error: "Thread not found" });
      }

      const t0 = found.rows[0];
      if (t0.student_id !== auth.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (t0.status === "closed") {
        return res
          .status(400)
          .json({ error: "Cannot escalate a solved doubt" });
      }

      const updated = await pool.query(
        `UPDATE threads
         SET is_escalated_to_professor = TRUE,
             escalated_at = COALESCE(escalated_at, NOW())
         WHERE thread_id = $1 AND student_id = $2
         RETURNING thread_id, title, status, student_id, ta_id,
                   COALESCE(is_escalated_to_professor, FALSE) AS is_escalated_to_professor,
                   escalated_at`,
        [threadId, auth.userId],
      );

      if (updated.rows.length === 0) {
        return res.status(404).json({ error: "Thread not found" });
      }

      const t = updated.rows[0];
      return res.json({
        thread: {
          threadId: t.thread_id,
          title: t.title,
          status: t.status,
          studentId: t.student_id,
          taId: t.ta_id,
          isEscalatedToProfessor: t.is_escalated_to_professor,
          escalatedAt: t.escalated_at,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to escalate thread" });
    }
  });

  router.post("/threads", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    const courseCtx = await requireCourseMember(pool, req, res, auth);
    if (!courseCtx) return;
    if (!requireRole(res, courseCtx.role, ["student"])) return;

    const { title } = req.body;
    if (typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "title is required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(424242)");

      const tas = await client.query(
        `SELECT cm.user_id
         FROM course_members cm
         WHERE cm.course_id = $1 AND cm.role = 'ta'
         ORDER BY cm.user_id ASC`,
        [courseCtx.courseId],
      );

      if (tas.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(503).json({ error: "No TA available" });
      }

      const lastAssigned = await client.query(
        "SELECT ta_id FROM threads WHERE course_id = $1 AND ta_id IS NOT NULL ORDER BY thread_id DESC LIMIT 1",
        [courseCtx.courseId],
      );
      const lastTaId = lastAssigned.rows[0]?.ta_id ?? null;

      let nextTaId = tas.rows[0].user_id;
      if (lastTaId != null) {
        const next = tas.rows.find((r) => r.user_id > lastTaId);
        nextTaId = next ? next.user_id : tas.rows[0].user_id;
      }

      const inserted = await client.query(
        `INSERT INTO threads (course_id, student_id, ta_id, title)
         VALUES ($1, $2, $3, $4)
         RETURNING thread_id, course_id, title, status, student_id, ta_id`,
        [courseCtx.courseId, auth.userId, nextTaId, title.trim()],
      );

      await client.query("COMMIT");

      const t = inserted.rows[0];
      return res.status(201).json({
        thread: {
          threadId: t.thread_id,
          courseId: t.course_id,
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

  router.patch("/threads/:threadId/status", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    const courseCtx = await requireCourseMember(pool, req, res, auth);
    if (!courseCtx) return;
    if (!requireRole(res, courseCtx.role, ["student"])) return;

    const threadId = Number(req.params.threadId);
    if (!Number.isInteger(threadId) || threadId <= 0) {
      return res
        .status(400)
        .json({ error: "threadId must be a positive integer" });
    }

    const rawStatus =
      typeof req.body?.status === "string"
        ? req.body.status
        : typeof req.body?.solved === "boolean"
          ? req.body.solved
            ? "closed"
            : "open"
          : "";

    const status = String(rawStatus).trim().toLowerCase();
    if (status !== "open" && status !== "closed") {
      return res
        .status(400)
        .json({ error: "status must be 'open' or 'closed'" });
    }

    try {
      const updated = await pool.query(
        `UPDATE threads
         SET status = $2
         WHERE thread_id = $1 AND course_id = $3 AND student_id = $4
         RETURNING thread_id, course_id, title, status, student_id, ta_id`,
        [threadId, status, courseCtx.courseId, auth.userId],
      );

      if (updated.rows.length === 0) {
        return res.status(404).json({ error: "Thread not found" });
      }

      const t = updated.rows[0];
      return res.json({
        thread: {
          threadId: t.thread_id,
          courseId: t.course_id,
          title: t.title,
          status: t.status,
          studentId: t.student_id,
          taId: t.ta_id,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to update thread status" });
    }
  });

  router.get("/threads/:threadId", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    const courseCtx = await requireCourseMember(pool, req, res, auth);
    if (!courseCtx) return;

    const threadId = Number(req.params.threadId);
    if (!Number.isInteger(threadId) || threadId <= 0) {
      return res
        .status(400)
        .json({ error: "threadId must be a positive integer" });
    }

    try {
      const result = await pool.query(
        `SELECT t.thread_id, t.course_id, t.title, t.status, t.student_id, t.ta_id,
                COALESCE(t.is_escalated_to_professor, FALSE) AS is_escalated_to_professor,
                t.escalated_at,
                s.email AS student_email,
                ta.email AS ta_email
         FROM threads t
         JOIN users s ON s.user_id = t.student_id
         LEFT JOIN users ta ON ta.user_id = t.ta_id
         WHERE t.thread_id = $1 AND t.course_id = $2
         LIMIT 1`,
        [threadId, courseCtx.courseId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Thread not found" });
      }

      const r = result.rows[0];
      const allowed =
        (courseCtx.role === "student" && r.student_id === auth.userId) ||
        (courseCtx.role === "ta" &&
          r.ta_id === auth.userId &&
          r.is_escalated_to_professor !== true) ||
        courseCtx.role === "professor";

      if (!allowed) {
        return res.status(403).json({ error: "Forbidden" });
      }

      return res.json({
        thread: {
          threadId: r.thread_id,
          courseId: r.course_id,
          title: r.title,
          status: r.status,
          studentId: r.student_id,
          taId: r.ta_id,
          isEscalatedToProfessor: r.is_escalated_to_professor,
          escalatedAt: r.escalated_at,
          studentEmail: r.student_email,
          taEmail: r.ta_email,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch thread" });
    }
  });

  router.get("/threads/:threadId/messages", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    const courseCtx = await requireCourseMember(pool, req, res, auth);
    if (!courseCtx) return;

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
        "SELECT thread_id, course_id, student_id, ta_id, COALESCE(is_escalated_to_professor, FALSE) AS is_escalated_to_professor FROM threads WHERE thread_id = $1 AND course_id = $2 LIMIT 1",
        [threadId, courseCtx.courseId],
      );

      if (threadResult.rows.length === 0) {
        return res.status(404).json({ error: "Thread not found" });
      }

      const thread = threadResult.rows[0];
      const allowed =
        (courseCtx.role === "student" && thread.student_id === auth.userId) ||
        (courseCtx.role === "ta" &&
          thread.ta_id === auth.userId &&
          thread.is_escalated_to_professor !== true) ||
        courseCtx.role === "professor";

      if (!allowed) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const result = await pool.query(
        `SELECT m.message_id, m.thread_id, m.sender_id, m.content, m.created_at, u.email, u.role
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
          senderRole: r.role,
          content: r.content,
          createdAt: r.created_at,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch thread messages" });
    }
  });

  router.post("/threads/:threadId/messages", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    const courseCtx = await requireCourseMember(pool, req, res, auth);
    if (!courseCtx) return;

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
        "SELECT thread_id, course_id, student_id, ta_id, status, COALESCE(is_escalated_to_professor, FALSE) AS is_escalated_to_professor FROM threads WHERE thread_id = $1 AND course_id = $2 LIMIT 1",
        [threadId, courseCtx.courseId],
      );

      if (threadResult.rows.length === 0) {
        return res.status(404).json({ error: "Thread not found" });
      }

      const thread = threadResult.rows[0];
      const allowed =
        (courseCtx.role === "student" && thread.student_id === auth.userId) ||
        (courseCtx.role === "ta" &&
          thread.ta_id === auth.userId &&
          thread.is_escalated_to_professor !== true) ||
        (courseCtx.role === "professor" &&
          thread.is_escalated_to_professor === true);

      if (!allowed) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (thread.status === "closed") {
        return res.status(403).json({ error: "Thread is closed" });
      }

      const inserted = await pool.query(
        `INSERT INTO messages (thread_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING message_id, thread_id, sender_id, content, created_at`,
        [threadId, auth.userId, content],
      );

      const m = inserted.rows[0];

      const enriched = await pool.query(
        `SELECT m.message_id, m.thread_id, m.sender_id, m.content, m.created_at, u.email, u.role
         FROM messages m
         JOIN users u ON u.user_id = m.sender_id
         WHERE m.message_id = $1
         LIMIT 1`,
        [m.message_id],
      );

      const r = enriched.rows[0] || null;
      return res.status(201).json({
        message: {
          messageId: r?.message_id ?? m.message_id,
          threadId: r?.thread_id ?? m.thread_id,
          senderId: r?.sender_id ?? m.sender_id,
          senderEmail: r?.email,
          senderRole: r?.role,
          content: r?.content ?? m.content,
          createdAt: r?.created_at ?? m.created_at,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to post thread message" });
    }
  });

  return router;
}

module.exports = { createThreadsRouter };
