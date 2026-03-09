import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { apiFetch } from "../lib/api";

export default function ChatDoubt() {
  const nav = useNavigate();
  const { id } = useParams();
  const { threads, user } = useOutletContext();

  const thread = useMemo(
    () => threads?.find((t) => String(t.threadId) === String(id)),
    [threads, id],
  );

  const title = thread?.title || "Doubt";

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  const lastSeenIdRef = useRef(0);

  async function fetchNewMessages() {
    if (!id) return;

    const data = await apiFetch(
      `/threads/${id}/messages?sinceId=${lastSeenIdRef.current}`,
    );

    const newOnes = Array.isArray(data?.messages) ? data.messages : [];
    if (newOnes.length === 0) return;

    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.messageId));
      const filtered = newOnes.filter((m) => !seen.has(m.messageId));
      if (filtered.length === 0) return prev;

      lastSeenIdRef.current = Math.max(
        lastSeenIdRef.current,
        Number(filtered[filtered.length - 1].messageId) || 0,
      );

      return [...prev, ...filtered];
    });
  }

  // fetch initial messages
  useEffect(() => {
    if (!id) return;
    setLoaded(false);
    lastSeenIdRef.current = 0;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiFetch(`/threads/${id}/messages`);
        const list = Array.isArray(data?.messages) ? data.messages : [];

        if (!cancelled) {
          setMessages(list);
          lastSeenIdRef.current = list.length
            ? Number(list[list.length - 1].messageId)
            : 0;
        }
      } catch (e) {
        const msg = e?.message || "Failed to load messages";
        if (!cancelled) setError(msg);

        if (String(msg).toLowerCase().includes("unauthorized")) {
          nav("/login", { replace: true });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, nav]);

  // polling logic
  useEffect(() => {
    if (!id || !loaded) return;

    let cancelled = false;

    (async () => {
      try {
        if (!cancelled) await fetchNewMessages();
      } catch (e) {
        const msg = e?.message || "Failed to refresh messages";
        if (!cancelled) setError(msg);
        if (!cancelled && String(msg).toLowerCase().includes("unauthorized")) {
          nav("/login", { replace: true });
        }
      }
    })();

    const intervalId = setInterval(async () => {
      try {
        if (!cancelled) await fetchNewMessages();
      } catch (e) {
        const msg = e?.message || "Failed to refresh messages";
        if (!cancelled) setError(msg);
        if (!cancelled && String(msg).toLowerCase().includes("unauthorized")) {
          nav("/login", { replace: true });
        }
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [id, nav, loaded]);

  // send new messages
  async function handleSend() {
    const content = input.trim();
    if (!content) return;

    try {
      setError("");

      const data = await apiFetch(`/threads/${id}/messages`, {
        method: "POST",
        body: { content },
      });

      const newMessage = data?.message;
      if (newMessage) {
        const newId = Number(newMessage.messageId) || 0;
        lastSeenIdRef.current = Math.max(lastSeenIdRef.current, newId);

        setMessages((prev) => {
          if (prev.some((m) => m.messageId === newMessage.messageId))
            return prev;
          return [...prev, newMessage];
        });

        lastSeenIdRef.current = Math.max(
          lastSeenIdRef.current,
          Number(newMessage.messageId) || 0,
        );
      }

      setInput("");
    } catch (e) {
      const msg = e?.message || "Failed to send message";
      setError(msg);

      if (String(msg).toLowerCase().includes("unauthorized")) {
        nav("/login", { replace: true });
      }
    }
  }

  return (
    <>
      <div
        style={{
          width: "100%",
          background: "#0f0f0f",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "36px",
          fontWeight: 600,
          fontSize: "1.15rem",
          marginBottom: "12px",
          borderRadius: "0",
        }}
      >
        {title}
      </div>

      {error ? (
        <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>
      ) : null}

      <div className="chat-bubbles" style={{ marginBottom: 16 }}>
        {loading ? (
          <div style={{ padding: 12 }}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{ padding: 12 }}>No messages yet.</div>
        ) : (
          messages.map((msg) => {
            const isUser = Number(msg.senderId) === Number(user?.id);
            return (
              <div
                key={msg.messageId}
                className={`chat-bubble ${isUser ? "user" : "bot"}`}
                style={{ marginBottom: 8 }}
              >
                {msg.content}
              </div>
            );
          })
        )}
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
        />
        <button onClick={handleSend} disabled={loading}>
          Send
        </button>
      </div>
    </>
  );
}
