const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const {
  pool,
  testDbConnection,
  ensureEscalationColumns,
} = require("./config/db");
const {
  isValidRole,
  requireAuth,
  getAuthContext,
  requireRole,
  signToken,
} = require("./middleware/auth");
const {
  parsePositiveInt,
  threadAccessFilter,
  randomJoinCode,
  getCourseRole,
  isCourseProfessor,
  requireCourseMember,
} = require("./lib/courseAccess");
const { createHealthRouter } = require("./routes/health");
const { createAuthRouter } = require("./routes/auth");
const { createCoursesRouter } = require("./routes/courses");
const { createProfessorRouter } = require("./routes/professor");
const { createThreadsRouter } = require("./routes/threads");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5177",
    ],
    credentials: true,
  }),
);

app.use(createHealthRouter({ pool }));
app.use(createAuthRouter({ pool, isValidRole, signToken }));
app.use(
  createCoursesRouter({
    pool,
    requireAuth,
    getAuthContext,
    requireRole,
    parsePositiveInt,
    randomJoinCode,
    getCourseRole,
    isCourseProfessor,
  }),
);
app.use(
  createProfessorRouter({
    pool,
    requireAuth,
    getAuthContext,
    requireRole,
    requireCourseMember,
  }),
);
app.use(
  createThreadsRouter({
    pool,
    requireAuth,
    getAuthContext,
    requireRole,
    requireCourseMember,
    threadAccessFilter,
  }),
);

testDbConnection();

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
