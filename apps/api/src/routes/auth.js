const express = require("express");
const bcrypt = require("bcryptjs");

function createAuthRouter({ pool, isValidRole, signToken }) {
  const router = express.Router();

  router.post("/auth/signup", async (req, res) => {
    const { email, password, role } = req.body;

    if (typeof email !== "string" || email.trim().length === 0) {
      return res.status(400).json({ error: "email is required" });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res
        .status(400)
        .json({ error: "password must be at least 8 chars" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userRole = (typeof role === "string" ? role : "student").trim();

    if (!isValidRole(userRole)) {
      return res.status(400).json({ error: "invalid role" });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);

      const inserted = await pool.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
         RETURNING user_id, email, role`,
        [normalizedEmail, passwordHash, userRole],
      );

      const user = inserted.rows[0];
      const token = signToken(user);
      return res.status(201).json({
        token,
        user: { id: user.user_id, email: user.email, role: user.role },
      });
    } catch (err) {
      if (err?.code === "23505") {
        return res.status(409).json({ error: "email already exists" });
      }
      console.error(err);
      return res.status(500).json({ error: "signup failed" });
    }
  });

  router.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (typeof email !== "string" || email.trim().length === 0) {
      return res.status(400).json({ error: "email is required" });
    }

    if (typeof password !== "string" || password.length === 0) {
      return res.status(400).json({ error: "password is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const found = await pool.query(
        `SELECT user_id, email, role, password_hash
         FROM users WHERE email = $1 LIMIT 1`,
        [normalizedEmail],
      );

      if (found.rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = found.rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = signToken(user);
      return res.json({
        token,
        user: { id: user.user_id, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "login failed" });
    }
  });

  return router;
}

module.exports = { createAuthRouter };
