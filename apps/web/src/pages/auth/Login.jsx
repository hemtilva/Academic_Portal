import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../stylesheets/AuthLayout.css";
import { apiFetch } from "../../lib/api";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0;
  }, [email, password]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("Logging in...");

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      localStorage.setItem("ap_token", data.token);
      localStorage.setItem("ap_user", JSON.stringify(data.user));

      setStatus("Success");
      nav("/courses");
    } catch (e) {
      setStatus(e?.message || "Login failed");
    }
  }

  return (
    <div className="ap-auth">
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
              placeholder="username"
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
