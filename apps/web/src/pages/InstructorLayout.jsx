import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./InstructorDashboard.css";

export default function InstructorLayout() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("ap_token");
    if (!token) {
      nav("/login", { replace: true });
      return;
    }
    const storedUser = localStorage.getItem("ap_user");
    if (storedUser) setUser(JSON.parse(storedUser));
    (async () => {
      try {
        setLoading(true);
        setError("");
        // Fetch escalated doubts
        const data = await apiFetch("/instructor/escalated-doubts");
        setDoubts(data.doubts || []);
      } catch (e) {
        setError(e.message || "Failed to load doubts");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  function logout(e) {
    e.preventDefault();
    localStorage.removeItem("ap_token");
    localStorage.removeItem("ap_user");
    nav("/login", { replace: true });
  }

  return (
    <div className="instructor-dashboard sd-container">
      <div className="sd-sidebar">
        <div className="sd-header">
          <div className="sd-avatar" />
          <span>{user?.email || "Instructor"}</span>
        </div>
        <div className="sd-nav">
          <a href="/login" onClick={logout}>Logout</a>
        </div>
        <div className="sd-doubtList">
          <div style={{ fontWeight: 600, margin: "8px 0" }}>Escalated Doubts</div>
          {loading ? (
            <div style={{ padding: 12 }}>Loading...</div>
          ) : error ? (
            <div style={{ padding: 12 }}>{error}</div>
          ) : doubts.length === 0 ? (
            <div style={{ padding: 12 }}>No escalated doubts.</div>
          ) : (
            doubts.map((d) => (
              <div key={d.thread_id} className="sd-doubtItem">
                <span>{d.title}</span>
                <div className={`sd-status ${d.status === "closed" ? "resolved" : "unresolved"}`} />
              </div>
            ))
          )}
        </div>
      </div>
      <div className="sd-chatArea">
        <Outlet context={{ user, doubts }} />
      </div>
    </div>
  );
}
