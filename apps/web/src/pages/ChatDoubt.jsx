import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { apiFetch } from "../lib/api";

export default function ChatDoubt() {
  const nav = useNavigate();
  const { id } = useParams();
  const { threads, user, reloadThreads } = useOutletContext();

  const thread = useMemo(
    () => threads?.find((t) => String(t.threadId) === String(id)),
    [threads, id],
  );

  const title = thread?.title || "Doubt";
  const isClosed = thread?.status === "closed";
  const canToggleSolved = user?.role === "student";
  const canReply = !isClosed || user?.role === "student";

  const leftTitleLabel = useMemo(() => {
    if (!user) return "";
    if (user.role === "student") {
      return thread?.taEmail ? `${thread.taEmail}` : "TA";
    }
    if (user.role === "ta" || user.role === "professor") {
      return thread?.studentEmail ? `${thread.studentEmail}` : "Student";
    }
    return "";
  }, [user, thread?.taEmail, thread?.studentEmail]);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const lastSeenIdRef = useRef(0);

  async function toggleSolved() {
    if (!id || !canToggleSolved) return;
    try {
      setToggling(true);
      setError("");

      const nextStatus = isClosed ? "open" : "closed";
      await apiFetch(`/threads/${id}/status`, {
        method: "PATCH",
        body: { status: nextStatus },
      });

      if (typeof reloadThreads === "function") {
        await reloadThreads();
      }
    } catch (e) {
      const msg = e?.message || "Failed to update status";
      setError(msg);
      if (String(msg).toLowerCase().includes("unauthorized")) {
        nav("/login", { replace: true });
      }
    } finally {
      setToggling(false);
    }
  }

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
      <div className="cd-titlebar">
        <div className="cd-titlebar__left" title={leftTitleLabel}>
          {leftTitleLabel}
        </div>
        <div className="cd-titlebar__title">{title}</div>
        <div className="cd-titlebar__right">
          {canToggleSolved ? (
            <button
              type="button"
              className={`cd-titlebar__action ${isClosed ? "is-closed" : "is-open"}`}
              onClick={toggleSolved}
              disabled={toggling}
            >
              {isClosed ? "Solved" : "Unsolved"}
            </button>
          ) : null}
        </div>
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
            const senderId = Number(msg.senderId);
            const viewerId = Number(user?.id);
            const taId = Number(thread?.taId);
            const isUser =
              user?.role === "professor"
                ? senderId === taId || senderId === viewerId
                : senderId === viewerId;
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
          placeholder={
            canReply ? "Type your message..." : "This doubt is solved"
          }
          disabled={!canReply}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canReply) handleSend();
          }}
        />
        <button onClick={handleSend} disabled={loading || !canReply}>
          Send
        </button>
      </div>
    </>
  );
}
