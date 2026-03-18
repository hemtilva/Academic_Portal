function parsePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function threadAccessFilter(role) {
  if (role === "student") return { where: "t.student_id = $1" };
  if (role === "ta") {
    return {
      where:
        "t.ta_id = $1 AND COALESCE(t.is_escalated_to_professor, FALSE) = FALSE",
    };
  }
  if (role === "professor") return { where: "TRUE" };
  return { where: "FALSE" };
}

function randomJoinCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function getCourseRole(pool, courseId, userId) {
  const found = await pool.query(
    `SELECT role
     FROM course_members
     WHERE course_id = $1 AND user_id = $2
     LIMIT 1`,
    [courseId, userId],
  );

  if (found.rows.length === 0) return null;
  return found.rows[0].role;
}

async function isCourseProfessor(pool, courseId, userId) {
  const found = await pool.query(
    "SELECT course_id FROM courses WHERE course_id = $1 AND professor_id = $2 LIMIT 1",
    [courseId, userId],
  );
  return found.rows.length > 0;
}

async function requireCourseMember(pool, req, res, auth) {
  const courseId = parsePositiveInt(req.query.courseId ?? req.body?.courseId);
  if (!courseId) {
    res.status(400).json({ error: "courseId is required" });
    return null;
  }

  const role = await getCourseRole(pool, courseId, auth.userId);
  if (!role) {
    res.status(403).json({ error: "Not a member of this course" });
    return null;
  }

  return { courseId, role };
}

module.exports = {
  parsePositiveInt,
  threadAccessFilter,
  randomJoinCode,
  getCourseRole,
  isCourseProfessor,
  requireCourseMember,
};
