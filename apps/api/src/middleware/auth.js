const jwt = require("jsonwebtoken");

function isValidRole(role) {
  return role === "student" || role === "ta" || role === "professor";
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;

  if (typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = auth.slice("Bearer ".length);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "JWT_SECRET not configured" });
    }

    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function getAuthContext(req, res) {
  const userId = Number(req.user?.sub);
  const role = req.user?.role;

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({ error: "Invalid token payload (sub)" });
    return null;
  }

  if (typeof role !== "string" || !isValidRole(role)) {
    res.status(401).json({ error: "Invalid token payload (role)" });
    return null;
  }

  return { userId, role };
}

function requireRole(res, role, allowed) {
  if (!allowed.includes(role)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing. Set it in apps/api/.env");
  }

  return jwt.sign(
    { sub: user.user_id, email: user.email, role: user.role },
    secret,
    { expiresIn: "7d" },
  );
}

module.exports = {
  isValidRole,
  requireAuth,
  getAuthContext,
  requireRole,
  signToken,
};
