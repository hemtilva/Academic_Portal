import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./StudentDoubts.css";

export default function DoubtsLayout() {
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
      const data = await apiFetch("/threads");
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

    const storedUser = localStorage.getItem("ap_user");
    if (storedUser) setUser(JSON.parse(storedUser));

    reloadThreads();
  }, [nav]);

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
          <button type="button" onClick={logout}>
            Logout
          </button>
          {showLogoutConfirm && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}>
              <div style={{
                background: '#f5e9da',
                padding: '2rem',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                minWidth: 320,
                textAlign: 'center',
                color: '#222',
                border: '1px solid #e2cdbb',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 18, color: '#222' }}>Confirm Logout</div>
                <div style={{ marginBottom: 18 }}>Are you sure you want to logout?</div>
                <button
                  style={{
                    background: '#222',
                    color: '#f5e9da',
                    fontWeight: 600,
                    fontSize: '1em',
                    padding: '0.6em 1.2em',
                    borderRadius: 8,
                    border: 'none',
                    marginRight: 12,
                    cursor: 'pointer',
                  }}
                  onClick={confirmLogout}
                >
                  Yes, Logout
                </button>
                <button
                  style={{
                    background: '#f5e9da',
                    color: '#222',
                    fontWeight: 600,
                    fontSize: '1em',
                    padding: '0.6em 1.2em',
                    borderRadius: 8,
                    border: '1px solid #e2cdbb',
                    cursor: 'pointer',
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
                to={`/doubts/${t.threadId}`}
                className={({ isActive }) =>
                  `sd-doubtItem${isActive ? " is-active" : ""}`
                }
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span>
                  #{t.threadId} - {t.title}
                </span>
                <div
                  className={`sd-status ${t.status === "closed" ? "resolved" : "unresolved"}`}
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
              onClick={() => nav("/doubts")}
              aria-label="Post a new doubt"
              title="Post a new doubt"
            >
              +
            </button>
          </div>
        ) : null}
      </div>

      <div className="sd-chatArea">
        <Outlet context={{ threads, user, reloadThreads }} />
      </div>
    </div>
  );
}
