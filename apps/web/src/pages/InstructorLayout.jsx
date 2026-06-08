import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "../stylesheets/StudentDoubts.css";

export default function InstructorLayout() {
  const { courseId, id } = useParams();
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState("");
  const [showSolved, setShowSolved] = useState(false);
  const [seenMap, setSeenMap] = useState({});
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 900px)").matches
      : false,
  );
  const [mobilePane, setMobilePane] = useState("sidebar");

  const seenStorageKey = user?.id
    ? `ap_seen_threads_v1_${user.id}_${courseId}`
    : null;

  function parseIsoTime(value) {
    if (!value) return 0;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }

  function persistSeenMap(next) {
    if (!seenStorageKey) return;
    try {
      localStorage.setItem(seenStorageKey, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  }

  function markThreadSeen(thread) {
    if (!thread || !seenStorageKey) return;
    const messageAt = thread?.lastMessageAt;
    if (!messageAt) return;

    const threadKey = String(thread.threadId);
    setSeenMap((prev) => {
      const prevSeenAt = prev?.[threadKey];
      if (parseIsoTime(prevSeenAt) >= parseIsoTime(messageAt)) return prev;
      const next = { ...prev, [threadKey]: messageAt };
      persistSeenMap(next);
      return next;
    });
  }

  function isThreadUnread(thread) {
    const messageAt = thread?.lastMessageAt;
    if (!messageAt) return false;
    if (id && String(id) === String(thread?.threadId)) return false;
    const seenAt = seenMap?.[String(thread.threadId)];
    return parseIsoTime(messageAt) > parseIsoTime(seenAt);
  }

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
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = (e) => setIsMobile(e.matches);

    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobilePane("sidebar");
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && id) {
      setMobilePane("content");
    }
  }, [isMobile, id]);

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
    if (!seenStorageKey) {
      setSeenMap({});
      return;
    }
    try {
      const raw = localStorage.getItem(seenStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setSeenMap(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setSeenMap({});
    }
  }, [seenStorageKey]);

  useEffect(() => {
    if (!id) return;
    const isViewingSolved = threads.some(
      (t) => String(t?.threadId) === String(id) && t?.status === "closed",
    );
    if (isViewingSolved) setShowSolved(true);

    const activeThread = threads.find(
      (t) => String(t?.threadId) === String(id),
    );
    if (activeThread) markThreadSeen(activeThread);
  }, [id, threads]);

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

  function openContentPane() {
    if (isMobile) setMobilePane("content");
  }

  return (
    <div
      className={`sd-container${isMobile ? ` is-mobile is-mobile-${mobilePane}` : ""}`}
    >
      <div
        className="sd-mobileSwitch"
        role="tablist"
        aria-label="Mobile layout switch"
      >
        <button
          type="button"
          className={`sd-mobileSwitchBtn${mobilePane === "sidebar" ? " is-active" : ""}`}
          onClick={() => setMobilePane("sidebar")}
        >
          Sidebar
        </button>
        <button
          type="button"
          className={`sd-mobileSwitchBtn${mobilePane === "content" ? " is-active" : ""}`}
          onClick={() => setMobilePane("content")}
        >
          Chat / Summary
        </button>
      </div>
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
            onClick={openContentPane}
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
            (() => {
              const unsolvedThreads = threads.filter(
                (t) => t?.status !== "closed",
              );
              const solvedThreads = threads.filter(
                (t) => t?.status === "closed",
              );

              return (
                <>
                  {unsolvedThreads.map((t) => (
                    <NavLink
                      key={t.threadId}
                      to={`/course/${courseId}/instructor/${t.threadId}`}
                      onClick={openContentPane}
                      className={({ isActive }) => {
                        const unread = isThreadUnread(t);
                        return `sd-doubtItem${isActive ? " is-active" : ""}${
                          unread && !isActive ? " is-unread" : ""
                        }`;
                      }}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <span>
                        #{t.threadId} - {t.title}
                      </span>
                      <div className="sd-status escalated" />
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
                          to={`/course/${courseId}/instructor/${t.threadId}`}
                          onClick={openContentPane}
                          className={({ isActive }) => {
                            const unread = isThreadUnread(t);
                            return `sd-doubtItem sd-doubtItem--solved${isActive ? " is-active" : ""}${
                              unread && !isActive ? " is-unread" : ""
                            }`;
                          }}
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
      </div>

      <div className="sd-chatArea">
        <Outlet context={{ threads, user, reloadThreads, courseId }} />
      </div>
    </div>
  );
}
