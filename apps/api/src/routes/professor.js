const express = require("express");

function createProfessorRouter({
  pool,
  requireAuth,
  getAuthContext,
  requireRole,
  requireCourseMember,
}) {
  const router = express.Router();

  router.get("/professor/ta-stats", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;
    if (!requireRole(res, auth.role, ["professor"])) return;

    const courseCtx = await requireCourseMember(pool, req, res, auth);
    if (!courseCtx) return;
    if (courseCtx.role !== "professor") {
      return res
        .status(403)
        .json({ error: "Only course professor can view TA stats" });
    }

    try {
      const result = await pool.query(
        `SELECT u.user_id AS ta_id,
                u.email AS ta_email,
                COUNT(t.thread_id) AS assigned_count,
                COALESCE(SUM(CASE WHEN t.status = 'closed' THEN 1 ELSE 0 END), 0) AS solved_count
         FROM users u
         LEFT JOIN threads t ON t.ta_id = u.user_id AND t.course_id = $1
         JOIN course_members cm ON cm.user_id = u.user_id AND cm.course_id = $1
         WHERE cm.role = 'ta'
         GROUP BY u.user_id, u.email
         ORDER BY u.email ASC`,
        [courseCtx.courseId],
      );

      return res.json({
        tas: result.rows.map((r) => ({
          taId: r.ta_id,
          email: r.ta_email,
          assignedCount: Number(r.assigned_count) || 0,
          solvedCount: Number(r.solved_count) || 0,
        })),
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Failed to load TA stats" });
    }
  });

  router.get("/professor/ta-doubts", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;
    if (!requireRole(res, auth.role, ["professor"])) return;

    const courseCtx = await requireCourseMember(pool, req, res, auth);
    if (!courseCtx) return;
    if (courseCtx.role !== "professor") {
      return res
        .status(403)
        .json({ error: "Only course professor can view TA doubts" });
    }

    try {
      const result = await pool.query(
        `SELECT ta.user_id AS ta_id,
                ta.email AS ta_email,
                t.thread_id,
                t.title,
                t.status,
                COALESCE(t.is_escalated_to_professor, FALSE) AS is_escalated_to_professor,
                s.email AS student_email
         FROM course_members cm
         JOIN users ta ON ta.user_id = cm.user_id
         LEFT JOIN threads t
           ON t.ta_id = ta.user_id AND t.course_id = $1
         LEFT JOIN users s ON s.user_id = t.student_id
         WHERE cm.course_id = $1 AND cm.role = 'ta'
         ORDER BY ta.email ASC, t.thread_id DESC`,
        [courseCtx.courseId],
      );

      const map = new Map();

      for (const r of result.rows) {
        const taId = r.ta_id;
        const taEmail = r.ta_email;

        if (!map.has(taId)) {
          map.set(taId, {
            taId,
            email: taEmail,
            assignedCount: 0,
            solvedCount: 0,
            doubts: [],
          });
        }

        const entry = map.get(taId);

        if (r.thread_id != null) {
          entry.assignedCount += 1;
          if (r.status === "closed") entry.solvedCount += 1;
          entry.doubts.push({
            threadId: r.thread_id,
            title: r.title,
            status: r.status,
            studentEmail: r.student_email,
            isEscalatedToProfessor: r.is_escalated_to_professor === true,
          });
        }
      }

      return res.json({ tas: Array.from(map.values()) });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Failed to load TA doubts" });
    }
  });

  return router;
}

module.exports = { createProfessorRouter };
