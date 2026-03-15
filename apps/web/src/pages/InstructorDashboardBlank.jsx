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
    <div style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
        TA Dashboard
      </div>

      {loading ? (
        <div style={{ padding: 12 }}>Loading...</div>
      ) : error ? (
        <div style={{ padding: 12, color: "#c00" }}>{error}</div>
      ) : tas.length === 0 ? (
        <div style={{ padding: 12, color: "#888" }}>No TAs found</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tas.map((ta) => (
            <details
              key={ta.taId}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <summary
                style={{
                  listStyle: "none",
                  cursor: "pointer",
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontWeight: 700 }}>{ta.email}</span>
                <span style={{ color: "#888", fontSize: 13 }}>
                  Assigned: {ta.assignedCount} · Solved: {ta.solvedCount}
                </span>
              </summary>

              <div style={{ padding: 6 }}>
                {Array.isArray(ta.doubts) && ta.doubts.length > 0 ? (
                  ta.doubts.map((d) => (
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
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          #{d.threadId} - {d.title}
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>
                          Asked by {d.studentEmail || "Student"} · {d.status === "closed" ? "Solved" : "Unsolved"} · {d.isEscalatedToProfessor ? "Escalated (reply)" : "View only"}
                        </div>
                      </div>

                      <div
                        className={`sd-status ${d.status === "closed" ? "resolved" : "unresolved"}`}
                      />
                    </button>
                  ))
                ) : (
                  <div style={{ padding: 12, color: "#888" }}>
                    No escalated doubts for this TA
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
