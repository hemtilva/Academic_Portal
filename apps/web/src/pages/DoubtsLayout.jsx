import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./StudentDoubts.css";

export default function DoubtsLayout() {
  const { courseId } = useParams();
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  async function reloadThreads() {
    try {
      setLoadingThreads(true);
      setThreadsError("");
      const data = await apiFetch(`/threads?courseId=${courseId}`);
      setThreads(data.threads || []);
    } catch (e) {
      setThreadsError(e.message || "Failed to load threads");
      if ((e.message || "").toLowerCase().includes("unauthorized")) {
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

    if (!courseId) {
      nav("/courses", { replace: true });
      return;
    }

    const storedUser = localStorage.getItem("ap_user");
    if (storedUser) setUser(JSON.parse(storedUser));

    reloadThreads();
  }, [nav, courseId]);

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
            <span>{user?.email || "Student-1"}</span>
          </div>
        </div>

        <div className="sd-nav">
          <button type="button" onClick={() => nav("/courses")}>
            Courses
          </button>
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
          {loadingThreads ? (
            <div style={{ padding: 12 }}>Loading...</div>
          ) : threadsError ? (
            <div style={{ padding: 12 }}>{threadsError}</div>
          ) : (
            threads.map((t) => (
              <NavLink
                key={t.threadId}
                to={`/course/${courseId}/doubts/${t.threadId}`}
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

        {user?.role === "student" ? (
          <div className="sd-composeBar">
            <button
              type="button"
              className="sd-composeBtn"
              onClick={() => nav(`/course/${courseId}/doubts`)}
              aria-label="Post a new doubt"
              title="Post a new doubt"
            >
              +
            </button>
          </div>
        ) : null}
      </div>

      <div className="sd-chatArea">
        <Outlet context={{ threads, user, reloadThreads, courseId }} />
      </div>
    </div>
  );
}
