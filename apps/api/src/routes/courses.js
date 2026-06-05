const express = require("express");
const {
  requireAuth,
  getAuthContext,
  requireRole,
} = require("../middleware/authCheck");
const {
  parsePositiveInt,
  randomJoinCode,
  getCourseRole,
  isCourseProfessor,
} = require("../lib/courseAccess");
const { createCourseController } = require("../controllers/courseController");

function createCoursesRouter({ pool }) {
  const {
    createCourse,
    getUserCourses,
    getCourseInfo,
    joinCourse,
    getCourseMembers,
    addCourseMember,
    removeCourseMember,
    exitCourse,
    deleteCourse,
  } = createCourseController({ pool });

  const router = express.Router();

  router.post("/", requireAuth, createCourse);

  router.get("/user", requireAuth, getUserCourses);

  router.get("/:courseId", requireAuth, getCourseInfo);

  router.post("/join", requireAuth, joinCourse);

  router.get("/:courseId/members", requireAuth, getCourseMembers);

  router.post("/:courseId/members", requireAuth, addCourseMember);

  router.delete("/:courseId/members/:userId", requireAuth, removeCourseMember);

  router.delete("/:courseId/enrollment", requireAuth, exitCourse);

  router.delete("/:courseId", requireAuth, deleteCourse);

  return router;
}

module.exports = { createCoursesRouter };
