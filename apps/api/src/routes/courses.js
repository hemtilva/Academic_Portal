const express = require("express");

function createCoursesRouter({
  pool,
  requireAuth,
  getAuthContext,
  requireRole,
  parsePositiveInt,
  randomJoinCode,
  getCourseRole,
  isCourseProfessor,
}) {
  const router = express.Router();

  async function applyMemberRemovalRules(client, courseId, userId, memberRole) {
    if (memberRole === "student") {
      await client.query(
        `DELETE FROM threads
         WHERE course_id = $1 AND student_id = $2`,
        [courseId, userId],
      );
      return { reassignedToTaId: null, deletedStudentThreads: true };
    }

    if (memberRole === "ta") {
      const assignedCountResult = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM threads
         WHERE course_id = $1 AND ta_id = $2`,
        [courseId, userId],
      );
      const assignedCount = Number(assignedCountResult.rows[0]?.count || 0);

      if (assignedCount > 0) {
        const replacementTa = await client.query(
          `SELECT cm.user_id
           FROM course_members cm
           LEFT JOIN threads t ON t.course_id = cm.course_id AND t.ta_id = cm.user_id
           WHERE cm.course_id = $1 AND cm.role = 'ta' AND cm.user_id <> $2
           GROUP BY cm.user_id
           ORDER BY COUNT(t.thread_id) ASC, cm.user_id ASC
           LIMIT 1`,
          [courseId, userId],
        );

        if (replacementTa.rows.length === 0) {
          const err = new Error(
            "Cannot remove TA: no replacement TA available for assigned doubts",
          );
          err.statusCode = 400;
          throw err;
        }

        const replacementTaId = replacementTa.rows[0].user_id;
        await client.query(
          `UPDATE threads
           SET ta_id = $3
           WHERE course_id = $1 AND ta_id = $2`,
          [courseId, userId, replacementTaId],
        );

        return {
          reassignedToTaId: replacementTaId,
          deletedStudentThreads: false,
        };
      }
    }

    return { reassignedToTaId: null, deletedStudentThreads: false };
  }

  router.post("/courses", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;
    if (!requireRole(res, auth.role, ["professor"])) return;

    const name = String(req.body?.name || "").trim();
    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : null;

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let inserted = null;
      for (let i = 0; i < 5; i += 1) {
        const joinCode = randomJoinCode(6);
        try {
          const created = await client.query(
            `INSERT INTO courses (name, description, professor_id, join_code)
             VALUES ($1, $2, $3, $4)
             RETURNING course_id, name, description, professor_id, join_code, created_at, is_active`,
            [name, description, auth.userId, joinCode],
          );
          inserted = created.rows[0];
          break;
        } catch (e) {
          if (e?.code !== "23505") {
            throw e;
          }
        }
      }

      if (!inserted) {
        await client.query("ROLLBACK");
        return res
          .status(500)
          .json({ error: "Failed to generate unique join code" });
      }

      await client.query(
        `INSERT INTO course_members (course_id, user_id, role)
         VALUES ($1, $2, 'professor')
         ON CONFLICT (course_id, user_id) DO NOTHING`,
        [inserted.course_id, auth.userId],
      );

      await client.query("COMMIT");

      return res.status(201).json({
        course: {
          courseId: inserted.course_id,
          name: inserted.name,
          description: inserted.description,
          professorId: inserted.professor_id,
          joinCode: inserted.join_code,
          createdAt: inserted.created_at,
          isActive: inserted.is_active,
          role: "professor",
        },
      });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore rollback errors
      }
      console.error(err);
      return res.status(500).json({ error: "Failed to create course" });
    } finally {
      client.release();
    }
  });

  router.get("/courses/user", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    try {
      const result = await pool.query(
        `SELECT c.course_id, c.name, c.description, c.professor_id, c.join_code, c.created_at, c.is_active,
                cm.role,
                p.email AS professor_email
         FROM course_members cm
         JOIN courses c ON c.course_id = cm.course_id
         JOIN users p ON p.user_id = c.professor_id
         WHERE cm.user_id = $1 AND c.is_active = TRUE
         ORDER BY c.created_at DESC`,
        [auth.userId],
      );

      return res.json({
        courses: result.rows.map((r) => ({
          courseId: r.course_id,
          name: r.name,
          description: r.description,
          professorId: r.professor_id,
          professorEmail: r.professor_email,
          joinCode: r.join_code,
          createdAt: r.created_at,
          isActive: r.is_active,
          role: r.role,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to load courses" });
    }
  });

  router.get("/courses/:courseId", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    const courseId = parsePositiveInt(req.params.courseId);
    if (!courseId) {
      return res
        .status(400)
        .json({ error: "courseId must be a positive integer" });
    }

    try {
      const role = await getCourseRole(pool, courseId, auth.userId);
      if (!role) {
        return res.status(403).json({ error: "Not a member of this course" });
      }

      const result = await pool.query(
        `SELECT c.course_id, c.name, c.description, c.professor_id, c.join_code, c.created_at, c.is_active,
                p.email AS professor_email
         FROM courses c
         JOIN users p ON p.user_id = c.professor_id
         WHERE c.course_id = $1
         LIMIT 1`,
        [courseId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Course not found" });
      }

      const r = result.rows[0];
      return res.json({
        course: {
          courseId: r.course_id,
          name: r.name,
          description: r.description,
          professorId: r.professor_id,
          professorEmail: r.professor_email,
          joinCode: r.join_code,
          createdAt: r.created_at,
          isActive: r.is_active,
          role,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch course" });
    }
  });

  router.post("/courses/join", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    const joinCode = String(req.body?.joinCode || "")
      .trim()
      .toUpperCase();

    if (!joinCode) {
      return res.status(400).json({ error: "joinCode is required" });
    }

    if (!requireRole(res, auth.role, ["student", "ta"])) return;

    try {
      const found = await pool.query(
        `SELECT course_id, name, description, professor_id, join_code, created_at, is_active
         FROM courses
         WHERE join_code = $1
         LIMIT 1`,
        [joinCode],
      );

      if (found.rows.length === 0) {
        return res.status(404).json({ error: "Invalid join code" });
      }

      const c = found.rows[0];
      if (!c.is_active) {
        return res.status(400).json({ error: "Course is inactive" });
      }

      await pool.query(
        `INSERT INTO course_members (course_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (course_id, user_id)
         DO UPDATE SET role = EXCLUDED.role`,
        [c.course_id, auth.userId, auth.role],
      );

      return res.json({
        course: {
          courseId: c.course_id,
          name: c.name,
          description: c.description,
          professorId: c.professor_id,
          joinCode: c.join_code,
          createdAt: c.created_at,
          isActive: c.is_active,
          role: auth.role,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to join course" });
    }
  });

  router.get("/courses/:courseId/members", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    const courseId = parsePositiveInt(req.params.courseId);
    if (!courseId) {
      return res
        .status(400)
        .json({ error: "courseId must be a positive integer" });
    }

    try {
      const role = await getCourseRole(pool, courseId, auth.userId);
      if (!role) {
        return res.status(403).json({ error: "Not a member of this course" });
      }

      const members = await pool.query(
        `SELECT cm.user_id, u.email, cm.role, cm.joined_at
         FROM course_members cm
         JOIN users u ON u.user_id = cm.user_id
         WHERE cm.course_id = $1
         ORDER BY cm.role ASC, u.email ASC`,
        [courseId],
      );

      return res.json({
        members: members.rows.map((m) => ({
          userId: m.user_id,
          email: m.email,
          role: m.role,
          joinedAt: m.joined_at,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to load members" });
    }
  });

  router.post("/courses/:courseId/members", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    const courseId = parsePositiveInt(req.params.courseId);
    if (!courseId) {
      return res
        .status(400)
        .json({ error: "courseId must be a positive integer" });
    }

    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const role = String(req.body?.role || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    if (!["student", "ta"].includes(role)) {
      return res.status(400).json({ error: "role must be student or ta" });
    }

    try {
      const professor = await isCourseProfessor(pool, courseId, auth.userId);
      if (!professor) {
        return res
          .status(403)
          .json({ error: "Only course professor can add members" });
      }

      const userResult = await pool.query(
        "SELECT user_id, email FROM users WHERE email = $1 LIMIT 1",
        [email],
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = userResult.rows[0];
      await pool.query(
        `INSERT INTO course_members (course_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (course_id, user_id)
         DO UPDATE SET role = EXCLUDED.role`,
        [courseId, user.user_id, role],
      );

      return res.status(201).json({
        member: {
          courseId,
          userId: user.user_id,
          email: user.email,
          role,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to add member" });
    }
  });

  router.delete(
    "/courses/:courseId/members/:userId",
    requireAuth,
    async (req, res) => {
      const auth = getAuthContext(req, res);
      if (!auth) return;

      const courseId = parsePositiveInt(req.params.courseId);
      const userId = parsePositiveInt(req.params.userId);

      if (!courseId || !userId) {
        return res
          .status(400)
          .json({ error: "courseId and userId must be positive integers" });
      }

      try {
        const professor = await isCourseProfessor(pool, courseId, auth.userId);
        if (!professor) {
          return res
            .status(403)
            .json({ error: "Only course professor can remove members" });
        }

        const course = await pool.query(
          "SELECT professor_id FROM courses WHERE course_id = $1 LIMIT 1",
          [courseId],
        );
        if (course.rows.length === 0) {
          return res.status(404).json({ error: "Course not found" });
        }

        if (Number(course.rows[0].professor_id) === userId) {
          return res
            .status(400)
            .json({ error: "Cannot remove course professor" });
        }

        const client = await pool.connect();
        try {
          await client.query("BEGIN");

          const member = await client.query(
            `SELECT role
             FROM course_members
             WHERE course_id = $1 AND user_id = $2
             LIMIT 1`,
            [courseId, userId],
          );

          if (member.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
              .status(404)
              .json({ error: "Member not found in this course" });
          }

          const memberRole = member.rows[0].role;
          const removalEffects = await applyMemberRemovalRules(
            client,
            courseId,
            userId,
            memberRole,
          );

          await client.query(
            "DELETE FROM course_members WHERE course_id = $1 AND user_id = $2",
            [courseId, userId],
          );

          await client.query("COMMIT");
          return res.json({ ok: true, removalEffects });
        } catch (innerErr) {
          try {
            await client.query("ROLLBACK");
          } catch {
            // ignore rollback errors
          }
          if (innerErr?.statusCode) {
            return res
              .status(innerErr.statusCode)
              .json({ error: innerErr.message || "Failed to remove member" });
          }
          throw innerErr;
        } finally {
          client.release();
        }
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to remove member" });
      }
    },
  );

  router.delete(
    "/courses/:courseId/enrollment",
    requireAuth,
    async (req, res) => {
      const auth = getAuthContext(req, res);
      if (!auth) return;

      const courseId = parsePositiveInt(req.params.courseId);
      if (!courseId) {
        return res
          .status(400)
          .json({ error: "courseId must be a positive integer" });
      }

      try {
        const memberRole = await getCourseRole(pool, courseId, auth.userId);
        if (!memberRole) {
          return res.status(404).json({ error: "Not enrolled in this course" });
        }

        if (!requireRole(res, memberRole, ["student", "ta"])) return;

        const client = await pool.connect();
        try {
          await client.query("BEGIN");

          const removalEffects = await applyMemberRemovalRules(
            client,
            courseId,
            auth.userId,
            memberRole,
          );

          await client.query(
            `DELETE FROM course_members
           WHERE course_id = $1 AND user_id = $2`,
            [courseId, auth.userId],
          );

          await client.query("COMMIT");
          return res.json({ ok: true, removalEffects });
        } catch (innerErr) {
          try {
            await client.query("ROLLBACK");
          } catch {
            // ignore rollback errors
          }
          if (innerErr?.statusCode) {
            return res
              .status(innerErr.statusCode)
              .json({ error: innerErr.message || "Failed to unenroll" });
          }
          throw innerErr;
        } finally {
          client.release();
        }
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to unenroll" });
      }
    },
  );

  router.delete("/courses/:courseId", requireAuth, async (req, res) => {
    const auth = getAuthContext(req, res);
    if (!auth) return;

    const courseId = parsePositiveInt(req.params.courseId);
    if (!courseId) {
      return res
        .status(400)
        .json({ error: "courseId must be a positive integer" });
    }

    try {
      const professor = await isCourseProfessor(pool, courseId, auth.userId);
      if (!professor) {
        return res
          .status(403)
          .json({ error: "Only course professor can delete this course" });
      }

      const deleted = await pool.query(
        `DELETE FROM courses
         WHERE course_id = $1 AND professor_id = $2
         RETURNING course_id`,
        [courseId, auth.userId],
      );

      if (deleted.rows.length === 0) {
        return res.status(404).json({ error: "Course not found" });
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to delete course" });
    }
  });

  return router;
}

module.exports = { createCoursesRouter };
