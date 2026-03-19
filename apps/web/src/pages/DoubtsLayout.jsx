import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./StudentDoubts.css";

export default function DoubtsLayout() {
  const { courseId, id } = useParams();
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSolved, setShowSolved] = useState(false);

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

  useEffect(() => {
    if (!id) return;
    const isViewingSolved = threads.some(
      (t) => String(t?.threadId) === String(id) && t?.status === "closed",
    );
    if (isViewingSolved) setShowSolved(true);
  }, [id, threads]);

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
          {loadingThreads ? (
            <div style={{ padding: 12 }}>Loading...</div>
          ) : threadsError ? (
            <div style={{ padding: 12 }}>{threadsError}</div>
          ) : (
            (() => {
              const unsolvedThreads = threads.filter((t) => t?.status !== "closed");
              const solvedThreads = threads.filter((t) => t?.status === "closed");

              return (
                <>
                  {unsolvedThreads.map((t) => (
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
                  ))}

                  {solvedThreads.length > 0 ? (
                    <button
                      type="button"
                      className={`sd-doubtItem sd-solvedToggle${showSolved ? " is-open" : ""}`}
                      onClick={() => setShowSolved((v) => !v)}
                    >
                      <span>Solved ({solvedThreads.length})</span>
                      <span className="sd-solvedChevron" aria-hidden="true">
                        {showSolved ? "▾" : "▸"}
                      </span>
                    </button>
                  ) : null}

                  {showSolved
                    ? solvedThreads.map((t) => (
                        <NavLink
                          key={t.threadId}
                          to={`/course/${courseId}/doubts/${t.threadId}`}
                          className={({ isActive }) =>
                            `sd-doubtItem sd-doubtItem--solved${isActive ? " is-active" : ""}`
                          }
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          <span>
                            #{t.threadId} - {t.title}
                          </span>
                          <div className="sd-status resolved" />
                        </NavLink>
                      ))
                    : null}
                </>
              );
            })()
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
