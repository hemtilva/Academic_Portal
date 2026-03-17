import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function InstructorDashboardBlank() {
  const nav = useNavigate();
  const [tas, setTas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch("/professor/ta-doubts");
        const list = Array.isArray(data?.tas) ? data.tas : [];
        if (!cancelled) setTas(list);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load TA dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="ap-page ap-page--centered ap-card">
      <div className="ap-title">TA Dashboard</div>

      {loading ? (
        <div className="ap-dashboard-empty">Loading...</div>
      ) : error ? (
        <div className="ap-status is-error">{error}</div>
      ) : tas.length === 0 ? (
        <div className="ap-dashboard-empty">No TAs found</div>
      ) : (
        <div className="ap-dashboard-list">
          {tas.map((ta) => (
            <details key={ta.taId} className="ap-dashboard-group">
              <summary className="ap-dashboard-summary">
                <span style={{ fontWeight: 700 }}>{ta.email}</span>
                <span className="ap-dashboard-summaryMeta">
                  Assigned: {ta.assignedCount} · Solved: {ta.solvedCount}
                </span>
              </summary>

              <div className="ap-dashboard-doubts">
                {(() => {
                  const doubts = Array.isArray(ta.doubts) ? ta.doubts : [];

                  if (doubts.length === 0) {
                    return (
                      <div className="ap-dashboard-empty">
                        No doubts assigned to this TA
                      </div>
                    );
                  }

                  return doubts.map((d) => (
                    <button
                      key={d.threadId}
                      type="button"
                      className="sd-doubtItem"
                      onClick={() => nav(`/instructor/${d.threadId}`)}
                      style={{
                        width: "100%",
                        border: "none",
                        background: "transparent",
                        color: "inherit",
                        textAlign: "left",
                      }}
                    >
                      <div className="ap-dashboard-itemMain">
                        <div className="ap-dashboard-itemTitle">
                          #{d.threadId} - {d.title}
                        </div>
                        <div className="ap-dashboard-itemMeta">
                          Asked by {d.studentEmail || "Student"} ·{" "}
                          {d.status === "closed" ? "Solved" : "Unsolved"} ·{" "}
                          {d.isEscalatedToProfessor
                            ? "Escalated (can reply)"
                            : "View only"}
                        </div>
                      </div>

                      <div
                        className={`sd-status ${
                          d.isEscalatedToProfessor
                            ? "escalated"
                            : d.status === "closed"
                              ? "resolved"
                              : "unresolved"
                        }`}
                      />
                    </button>
                  ));
                })()}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
