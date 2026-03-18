const express = require("express");

function createHealthRouter({ pool }) {
  const router = express.Router();

  router.get("/health", async (req, res) => {
    try {
      await pool.query("SELECT 1 AS ok");
      res.json({ ok: true, db: "ok" });
    } catch {
      res.status(500).json({ ok: false, db: "error" });
    }
  });

  return router;
}

module.exports = { createHealthRouter };
