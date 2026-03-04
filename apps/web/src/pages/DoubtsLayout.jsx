import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import "./StudentDoubts.css";

export default function DoubtsLayout() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("ap_token");
    if (!token) {
      nav("/login", { replace: true });
      return;
    }

    const storedUser = localStorage.getItem("ap_user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, [nav]);

  const doubts = useMemo(
    () => [
      { id: 1, title: "Doubt 1", resolved: false },
      { id: 2, title: "Doubt 2", resolved: true },
      { id: 3, title: "Doubt 3", resolved: false },
    ],
    [],
  );

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
          <div className="sd-avatar" />
          <span>{user?.name || "Student-1"}</span>
        </div>

        <div className="sd-nav">
          <a href="/login" onClick={logout}>
            Logout
          </a>
        </div>

        <div className="sd-doubtList">
          {doubts.map((doubt) => (
            <Link
              key={doubt.id}
              to={`/doubts/${doubt.id}`}
              className="sd-doubtItem"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <span>{doubt.title}</span>
              <div
                className={`sd-status ${
                  doubt.resolved ? "resolved" : "unresolved"
                }`}
              />
            </Link>
          ))}
        </div>
      </div>

      <div className="sd-chatArea">
        <Outlet context={{ doubts, user }} />
      </div>
    </div>
  );
}
