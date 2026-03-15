
import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function StudentDoubts() {
  const outlet = useOutletContext();
  const user = outlet.user;
  const reloadThreads = outlet.reloadThreads;
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user?.role !== "student") {
    return <div>Select a doubt to view the conversation.</div>;
  }

  const canSubmit = title.trim() && message.trim() && !submitting;

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setStatus("Creating doubt...");

      const created = await apiFetch("/threads", {
        method: "POST",
        body: { title: title.trim() },
      });

      const threadId = created?.thread?.threadId;
      if (!threadId) throw new Error("Missing threadId from API");

      setStatus("Posting first message...");
      await apiFetch(`/threads/${threadId}/messages`, {
        method: "POST",
        body: { content: message.trim() },
      });

      if (typeof reloadThreads === "function") await reloadThreads();

      setStatus("");
      nav(`/doubts/${threadId}`);
    } catch (err) {
      setStatus(err?.message || "Failed to create doubt");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ width: "100%", maxWidth: 650, margin: "0 auto" }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
        New Doubt
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Subject / Title"
        style={{ width: "100%", padding: 12, marginBottom: 12 }}
      />

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your doubt..."
        rows={6}
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 12,
          resize: "vertical",
        }}
      />

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          background: canSubmit ? '#f5e9da' : '#f5e9da',
          color: canSubmit ? '#222' : '#888',
          fontWeight: 600,
          fontSize: '1em',
          padding: '0.6em 1.2em',
          borderRadius: 8,
          border: '1px solid #e2cdbb',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        {submitting ? "Posting..." : "Post Doubt"}
      </button>

      {status ? <div style={{ marginTop: 10 }}>{status}</div> : null}
    </form>
  );
}
