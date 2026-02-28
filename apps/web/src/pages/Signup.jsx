import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AuthLayout.css";
import doodleUrl from "../assets/doodle.png";

const API_BASE = "http://localhost:3001";

export default function Signup() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 0 &&
      password.trim().length > 0 &&
      confirmPassword.trim().length > 0 &&
      password === confirmPassword
    );
  }, [email, password, confirmPassword]);

  useEffect(() => {
    const token = localStorage.getItem("ap_token");
    if (token) nav("/");
  }, [nav]);

  async function onSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("Passwords do not match");
      return;
    }
    if (!canSubmit) return;
    setStatus("Creating account...");

    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role: "student" }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data.error || `Signup failed (${res.status})`);
      return;
    }

    localStorage.setItem("ap_token", data.token);
    localStorage.setItem("ap_user", JSON.stringify(data.user));

    setStatus("Account created. Logged in!");
    nav("/");
  }

  return (
    <div className="ap-auth">
      <div className="ap-auth__art" aria-hidden="true">
        <img className="ap-auth__doodle" src={doodleUrl} alt="" />
      </div>

      <div className="ap-auth__panel">
        <div className="ap-auth__panelInner">
          <h1 className="ap-auth__title">
            <span className="ap-auth__titleLine">ACADEMIC</span>
            <span className="ap-auth__titleLine">PORTAL</span>
          </h1>

          <form className="ap-auth__form" onSubmit={onSubmit}>
            <input
              className="ap-auth__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username@gmail.com"
              autoComplete="email"
            />

            <input
              className="ap-auth__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password..."
              autoComplete="new-password"
            />

            <input
              className="ap-auth__input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="confirm password..."
              autoComplete="new-password"
            />

            <div className="ap-auth__divider" />

            <button
              className="ap-auth__button"
              type="submit"
              disabled={!canSubmit}
            >
              Sign up
            </button>

            <div className="ap-auth__status">{status}</div>
          </form>

          <div className="ap-auth__linkRow">
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
