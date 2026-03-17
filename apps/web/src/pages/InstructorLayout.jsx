import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./StudentDoubts.css";

export default function InstructorLayout() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState("");

  async function reloadThreads() {
    try {
      setLoadingThreads(true);
      setThreadsError("");

      const data = await apiFetch("/threads");
      const list = Array.isArray(data?.threads) ? data.threads : [];
      setThreads(list.filter((t) => t.isEscalatedToProfessor));
    } catch (e) {
      const msg = e?.message || "Failed to load threads";
      setThreadsError(msg);
      if (String(msg).toLowerCase().includes("unauthorized")) {
        nav("/login", { replace: true });
      }
    } finally {
      setLoadingThreads(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("ap_token");
    if (!token) {
      nav("/login", { replace: true });
      return;
    }

    const storedUser = localStorage.getItem("ap_user");
    if (storedUser) setUser(JSON.parse(storedUser));

    reloadThreads();
  }, [nav]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  function logout(e) {
    e.preventDefault();
    setShowLogoutConfirm(true);
  }
  function confirmLogout() {
    localStorage.removeItem("ap_token");
    localStorage.removeItem("ap_user");
    nav("/login", { replace: true });
    setShowLogoutConfirm(false);
  }
  function cancelLogout() {
    setShowLogoutConfirm(false);
  }

  return (
    <div className="sd-container">
      <div className="sd-sidebar">
        <div className="sd-header">
          <div className="sd-headerLeft">
            <div className="sd-avatar" />
            <span>{user?.email || "Instructor"}</span>
          </div>
        </div>

        <div className="sd-nav">
          <button type="button" onClick={logout}>
            Logout
          </button>
          {showLogoutConfirm && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "var(--ap-overlay)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  background: "var(--ap-surface)",
                  padding: "2rem",
                  borderRadius: 12,
                  boxShadow: "0 8px 28px rgba(0,0,0,0.4)",
                  minWidth: 320,
                  textAlign: "center",
                  color: "var(--ap-text)",
                  border: "1px solid var(--ap-border)",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 18,
                    color: "var(--ap-text)",
                  }}
                >
                  Confirm Logout
                </div>
                <div style={{ marginBottom: 18 }}>
                  Are you sure you want to logout?
                </div>
                <button
                  style={{
                    background: "var(--ap-primary)",
                    color: "#2e2432",
                    fontWeight: 600,
                    fontSize: "1em",
                    padding: "0.6em 1.2em",
                    borderRadius: 8,
                    border: "1px solid var(--ap-primary-strong)",
                    marginRight: 12,
                    cursor: "pointer",
                  }}
                  onClick={confirmLogout}
                >
                  Yes, Logout
                </button>
                <button
                  style={{
                    background: "transparent",
                    color: "var(--ap-text)",
                    fontWeight: 600,
                    fontSize: "1em",
                    padding: "0.6em 1.2em",
                    borderRadius: 8,
                    border: "1px solid var(--ap-border-strong)",
                    cursor: "pointer",
                  }}
                  onClick={cancelLogout}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="sd-doubtList">
          <NavLink
            to="/instructor"
            end
            className={({ isActive }) =>
              `sd-doubtItem${isActive ? " is-active" : ""}`
            }
            style={{
              textDecoration: "none",
              color: "inherit",
              marginBottom: 16,
            }}
          >
            Dashboard
          </NavLink>

          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              margin: "16px 0 8px 0",
              color: "var(--ap-accent)",
            }}
          >
            Escalated Doubts
          </div>

          {loadingThreads ? (
            <div style={{ padding: 12 }}>Loading...</div>
          ) : threadsError ? (
            <div style={{ padding: 12 }}>{threadsError}</div>
          ) : threads.length === 0 ? (
            <div style={{ padding: 12, color: "var(--ap-muted)" }}>
              No escalated doubts
            </div>
          ) : (
            threads.map((t) => (
              <NavLink
                key={t.threadId}
                to={`/instructor/${t.threadId}`}
                className={({ isActive }) =>
                  `sd-doubtItem${isActive ? " is-active" : ""}`
                }
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span>
                  #{t.threadId} - {t.title}
                </span>
                <div
                  className={`sd-status ${
                    t.isEscalatedToProfessor
                      ? "escalated"
                      : t.status === "closed"
                        ? "resolved"
                        : "unresolved"
                  }`}
                />
              </NavLink>
            ))
          )}
        </div>
      </div>

      <div className="sd-chatArea">
        <Outlet context={{ threads, user, reloadThreads }} />
      </div>
    </div>
  );
}
