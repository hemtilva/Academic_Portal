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
    <form onSubmit={onSubmit} className="ap-page ap-page--centered ap-card">
      <div className="ap-title">New Doubt</div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Subject / Title"
        className="ap-input"
      />

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your doubt..."
        rows={6}
        className="ap-textarea"
      />

      <button type="submit" disabled={!canSubmit} className="ap-button">
        {submitting ? "Posting..." : "Post Doubt"}
      </button>

      {status ? (
        <div
          className={`ap-status${status.toLowerCase().includes("failed") ? " is-error" : ""}`}
        >
          {status}
        </div>
      ) : null}
    </form>
  );
}
