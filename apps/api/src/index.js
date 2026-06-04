const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const { pool, testDbConnection } = require("./config/db");
const { upload } = require("./config/multer");

const { createHealthRouter } = require("./routes/health");
const { createAuthRouter } = require("./routes/auth");
const { createCoursesRouter } = require("./routes/courses");
const { createProfessorRouter } = require("./routes/professor");
const { createThreadsRouter } = require("./routes/threads");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use("/health", createHealthRouter({ pool }));
app.use("/auth", createAuthRouter({ pool }));
app.use("/courses", createCoursesRouter({ pool }));
app.use("/professor", createProfessorRouter({ pool }));
app.use("/threads", createThreadsRouter({ pool }));

(async () => {
  await testDbConnection();

  app.listen(PORT, HOST, () => {
    console.log(`API listening on http://${HOST}:${PORT}`);
  });
})();
