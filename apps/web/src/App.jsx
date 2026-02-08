import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "http://localhost:3001";

export default function App() {
  const [threadId, setThreadId] = useState("demo");
  const [sender, setSender] = useState("student1");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("idle");

  const lastSeenIdRef = useRef(0);

  const canSend = useMemo(() => {
    return threadId.trim().length > 0 && sender.trim().length > 0 && text.trim().length > 0;
  }, [threadId, sender, text]);

  async function pollOnce() {
    const currentThread = threadId.trim();
    if (!currentThread) return;

    const sinceId = lastSeenIdRef.current;
    const url = new URL(`${API_BASE}/messages`);
    url.searchParams.set("threadId", currentThread);
    if (sinceId > 0) url.searchParams.set("sinceId", String(sinceId));

    setStatus("polling");
    const res = await fetch(url.toString());
    if (!res.ok) {
      setStatus(`poll error (${res.status})`);
      return;
    }

    const newMessages = await res.json();
    if (Array.isArray(newMessages) && newMessages.length > 0) {
      setMessages((prev) => [...prev, ...newMessages]);
      const maxId = Math.max(...newMessages.map((m) => m.id ?? 0));
      if (maxId > lastSeenIdRef.current) lastSeenIdRef.current = maxId;
    }

    setStatus("idle");
  }

  useEffect(() => {
    // When thread changes, reset local state for clarity
    setMessages([]);
    lastSeenIdRef.current = 0;

    // Poll immediately, then every 5 seconds
    let cancelled = false;

    (async () => {
      try {
        await pollOnce();
      } catch (e) {
        if (!cancelled) setStatus("poll exception");
      }
    })();

    const id = setInterval(() => {
      pollOnce().catch(() => setStatus("poll exception"));
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!canSend) return;

    const payload = {
      threadId: threadId.trim(),
      sender: sender.trim(),
      text: text.trim()
    };

    setStatus("sending");
    const res = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      setStatus(`send error (${res.status})`);
      return;
    }

    // We could optimistically add it, but easiest is:
    // clear input and let polling pull it in.
    setText("");
    setStatus("idle");

    // Optionally poll immediately so it shows up fast
    await pollOnce();
  }

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Messaging (Polling)</h1>

      <form onSubmit={sendMessage} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <label>
          Thread ID
          <input
            value={threadId}
            onChange={(e) => setThreadId(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="demo"
          />
        </label>

        <label>
          Sender
          <input
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="student1"
          />
        </label>

        <label>
          Message
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="Type a message…"
          />
        </label>

        <button type="submit" disabled={!canSend} style={{ padding: 10 }}>
          Send
        </button>

        <div style={{ fontSize: 12, opacity: 0.7 }}>Status: {status}</div>
      </form>

      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Messages</div>
        {messages.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No messages yet (polling every 5s).</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {messages.map((m) => (
              <li key={m.id}>
                <span style={{ fontWeight: 600 }}>{m.sender}</span>: {m.text}{" "}
                <span style={{ opacity: 0.6, fontSize: 12 }}>
                  (#{m.id} at {m.createdAt})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}