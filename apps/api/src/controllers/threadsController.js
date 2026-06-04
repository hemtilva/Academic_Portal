const {
  requireAuth,
  getAuthContext,
  requireRole,
} = require("../middleware/authCheck");
const {
  threadAccessFilter,
  requireCourseMember,
} = require("../lib/courseAccess");
