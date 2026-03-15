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
  const canReply = useMemo(() => {
    if (!user) return false;
    if (user.role === "student") return true;
    if (isClosed) return false;
    if (user.role === "professor") return !!thread?.isEscalatedToProfessor;
    return true; // ta (and any other non-student roles) can reply to open threads
  }, [user, isClosed, thread?.isEscalatedToProfessor]);

  const replyPlaceholder = useMemo(() => {
    if (canReply) return "Type your message...";
    if (isClosed) return "This doubt is solved";
    if (user?.role === "professor") return "View only (not escalated)";
    return "You cannot reply";
  }, [canReply, isClosed, user?.role]);

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
  const [escalating, setEscalating] = useState(false);
  const [showSolvedConfirm, setShowSolvedConfirm] = useState(false);
  const [showEscalateConfirm, setShowEscalateConfirm] = useState(false);
  const lastSeenIdRef = useRef(0);

  function toggleSolved() {
    if (!id || !canToggleSolved) return;
    setShowSolvedConfirm(true);
  }
  async function confirmToggleSolved() {
    try {
      setToggling(true);
      setError("");
      setShowSolvedConfirm(false);
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
  function cancelToggleSolved() {
    setShowSolvedConfirm(false);
  }

  function escalateToProfessor() {
    if (!id || user?.role !== "student") return;
    if (thread?.isEscalatedToProfessor) return;
    setShowEscalateConfirm(true);
  }
  async function confirmEscalateToProfessor() {
    try {
      setEscalating(true);
      setError("");
      setShowEscalateConfirm(false);
      await apiFetch(`/threads/${id}/escalate`, {
        method: "PATCH",
      });
      if (typeof reloadThreads === "function") {
        await reloadThreads();
      }
    } catch (e) {
      const msg = e?.message || "Failed to escalate";
      setError(msg);
      if (String(msg).toLowerCase().includes("unauthorized")) {
        nav("/login", { replace: true });
      }
    } finally {
      setEscalating(false);
    }
  }
  function cancelEscalateToProfessor() {
    setShowEscalateConfirm(false);
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
    if (!canReply) return;
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
            <>
              <button
                type="button"
                className={`cd-titlebar__action ${isClosed ? "is-closed" : "is-open"}`}
                onClick={toggleSolved}
                disabled={toggling}
              >
                {isClosed ? "Solved" : "Unsolved"}
              </button>
              {showSolvedConfirm && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }}>
                  <div style={{
                    background: '#f5e9da',
                    padding: '2rem',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    minWidth: 320,
                    textAlign: 'center',
                    color: '#222',
                    border: '1px solid #e2cdbb',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 18, color: '#222' }}>Confirm Status Change</div>
                    <div style={{ marginBottom: 18 }}>Are you sure you want to mark this doubt as {isClosed ? 'unsolved' : 'solved'}?</div>
                    <button
                      style={{
                        background: '#222',
                        color: '#f5e9da',
                        fontWeight: 600,
                        fontSize: '1em',
                        padding: '0.6em 1.2em',
                        borderRadius: 8,
                        border: 'none',
                        marginRight: 12,
                        cursor: 'pointer',
                      }}
                      onClick={confirmToggleSolved}
                    >
                      Yes
                    </button>
                    <button
                      style={{
                        background: '#f5e9da',
                        color: '#222',
                        fontWeight: 600,
                        fontSize: '1em',
                        padding: '0.6em 1.2em',
                        borderRadius: 8,
                        border: '1px solid #e2cdbb',
                        cursor: 'pointer',
                      }}
                      onClick={cancelToggleSolved}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                className="cd-titlebar__action"
                onClick={escalateToProfessor}
                disabled={escalating || !!thread?.isEscalatedToProfessor}
                title={
                  thread?.isEscalatedToProfessor
                    ? "Already escalated"
                    : "Escalate this doubt to the professor"
                }
              >
                {thread?.isEscalatedToProfessor ? "Escalated" : "Escalate"}
              </button>
              {showEscalateConfirm && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }}>
                  <div style={{
                    background: '#fff',
                    padding: '2rem',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    minWidth: 320,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 18 }}>Confirm Escalation</div>
                    <div style={{ marginBottom: 18 }}>Are you sure you want to escalate this doubt to the professor?</div>
                    <button style={{ marginRight: 12 }} onClick={confirmEscalateToProfessor}>Yes</button>
                    <button onClick={cancelEscalateToProfessor}>Cancel</button>
                  </div>
                </div>
              )}
            </>
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
                style={{
                  marginBottom: 8,
                  background: isUser ? '#f5e9da' : '#b89b6c',
                  color: isUser ? '#222' : '#fff',
                  color: '#222',
                  borderRadius: 12,
                  padding: '12px 16px',
                  maxWidth: '70%',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
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
          placeholder={replyPlaceholder}
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
