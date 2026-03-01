import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./StudentDoubts.css";

export default function StudentDoubts() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("ap_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const doubts = [
    { id: 1, title: "Doubt 1", resolved: false },
    { id: 2, title: "Doubt 2", resolved: true },
    { id: 3, title: "Doubt 3", resolved: false },
  ];

  return (
    <>
      <div className="sd-container">
        <div className="sd-sidebar">
          <div className="sd-header">
            <div className="sd-avatar" />
            <span>{user?.name || "Student-1"}</span>
          </div>
          <div className="sd-nav">
            <a href="/login">Logout</a>
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
          <div style={{
            color: '#222',
            fontSize: '3vw',
            margin: '0',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
          }}>
            Select a doubt to look through or add a new doubt.
          </div>
        </div>
      </div>
    </>
  );
}