import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./StudentDoubts.css";

export default function InstructorLayout() {
  const { courseId } = useParams();
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState("");

  async function reloadThreads() {
    try {
      setLoadingThreads(true);
      setThreadsError("");

      const data = await apiFetch(`/threads?courseId=${courseId}`);
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

    if (!courseId) {
      nav("/courses", { replace: true });
      return;
    }

    const storedUser = localStorage.getItem("ap_user");
    if (storedUser) setUser(JSON.parse(storedUser));

    reloadThreads();
  }, [nav, courseId]);

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
          <button type="button" onClick={() => nav("/courses")}>
            Courses
          </button>
          <button type="button" onClick={logout}>
            Logout
          </button>
          {showLogoutConfirm && (
            <div className="sd-modalOverlay" role="dialog" aria-modal="true">
              <div className="sd-modalCard">
                <div className="sd-modalTitle">Confirm Logout</div>
                <div className="sd-modalBody">
                  Are you sure you want to logout?
                </div>
                <div className="sd-modalActions">
                  <button
                    type="button"
                    className="sd-modalBtn is-primary"
                    onClick={confirmLogout}
                  >
                    Yes, Logout
                  </button>
                  <button
                    type="button"
                    className="sd-modalBtn is-accent"
                    onClick={cancelLogout}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sd-doubtList">
          <NavLink
            to={`/course/${courseId}/instructor`}
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
                to={`/course/${courseId}/instructor/${t.threadId}`}
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
        <Outlet context={{ threads, user, reloadThreads, courseId }} />
      </div>
    </div>
  );
}
