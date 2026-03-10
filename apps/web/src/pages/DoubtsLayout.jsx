import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./StudentDoubts.css";

export default function DoubtsLayout() {
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
    localStorage.removeItem("ap_token");
    localStorage.removeItem("ap_user");
    nav("/login", { replace: true });
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
          <a href="/login" onClick={logout}>
            Logout
          </a>
        </div>

        <div className="sd-doubtList">
          {loadingThreads ? (
            <div style={{ padding: 12 }}>Loading...</div>
          ) : threadsError ? (
            <div style={{ padding: 12 }}>{threadsError}</div>
          ) : (
            threads.map((t) => (
              <Link
                key={t.threadId}
                to={`/doubts/${t.threadId}`}
                className="sd-doubtItem"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span>{t.title}</span>
                <div
                  className={`sd-status ${t.status === "closed" ? "resolved" : "unresolved"}`}
                />
              </Link>
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
