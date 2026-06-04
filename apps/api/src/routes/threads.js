const express = require("express");
const {
  requireAuth,
  getAuthContext,
  requireRole,
} = require("../middleware/authCheck");
const {
  threadAccessFilter,
  requireCourseMember,
} = require("../lib/courseAccess");
const { createThreadController } = require("../controllers/threadsController");

function createThreadsRouter({ pool }) {
  const {
    getAllCourseThreads,
    escalateThread,
    createNewThread,
    changeStatus,
    getThreadInfo,
    getMessages,
    postMessage,
    editMessage,
    deleteMessage,
  } = createThreadController({ pool });

  const router = express.Router();

  router.get("/", requireAuth, getAllCourseThreads);

  router.patch("/:threadId/escalate", requireAuth, escalateThread);

  router.post("/", requireAuth, createNewThread);

  router.patch("/:threadId/status", requireAuth, changeStatus);

  router.get("/:threadId", requireAuth, getThreadInfo);

  router.get("/:threadId/messages", requireAuth, getMessages);

  router.post("/:threadId/messages", requireAuth, postMessage);

  router.patch("/:threadId/messages/:messageId", requireAuth, editMessage);

  router.delete("/:threadId/messages/:messageId", requireAuth, deleteMessage);

  return router;
}

module.exports = { createThreadsRouter };
