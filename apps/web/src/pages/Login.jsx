import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AuthLayout.css";
import doodleUrl from "../assets/doodle.png";
const API_BASE = "http://localhost:3001";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0;
  }, [email, password]);

  useEffect(() => {
    const token = localStorage.getItem("ap_token");
    if (token) nav("/");
  }, [nav]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("Logging in...");

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setStatus(err.error || `Login failed (${res.status})`);
      return;
    }

    const data = await res.json(); // { token, user }
    localStorage.setItem("ap_token", data.token);
    localStorage.setItem("ap_user", JSON.stringify(data.user));

    setStatus("Success");
    nav("/doubts");
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
              autoComplete="current-password"
            />

            <div className="ap-auth__divider" />

            <button
              className="ap-auth__button"
              type="submit"
              disabled={!canSubmit}
            >
              Login
            </button>

            <div className="ap-auth__status">{status}</div>
          </form>

          <div className="ap-auth__linkRow">
            No account? <Link to="/signup">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
