
import { useState } from "react";

export default function InstructorPage() {
  const [tab, setTab] = useState("escalated");

  return (
    <div style={{ width: "100%", maxWidth: 650, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button
          style={{
            padding: "10px 24px",
            fontWeight: 600,
            background: tab === "dashboard" ? "#e0e0e0" : "#fff",
            border: "1px solid #ccc",
            borderRadius: 6,
            cursor: "pointer"
          }}
          onClick={() => setTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          style={{
            padding: "10px 24px",
            fontWeight: 600,
            background: tab === "escalated" ? "#e0e0e0" : "#fff",
            border: "1px solid #ccc",
            borderRadius: 6,
            cursor: "pointer"
          }}
          onClick={() => setTab("escalated")}
        >
          Escalated Doubts
        </button>
      </div>
      {tab === "dashboard" && (
        <div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>
          {/* Blank dashboard for now */}
        </div>
      )}
      {tab === "escalated" && (
        <div style={{ color: "#888", textAlign: "center", padding: "2rem" }}>
          {/* Escalated doubts UI will go here */}
          Escalated Doubts (UI coming soon)
        </div>
      )}
    </div>
  );
}
