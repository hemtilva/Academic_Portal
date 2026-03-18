import {
  useOutletContext,
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { apiFetch } from "../lib/api";

export default function ChatDoubt() {
  const nav = useNavigate();
  const location = useLocation();
  const { id, courseId } = useParams();
  const { threads, user, reloadThreads } = useOutletContext();

  const isInstructorRoute = useMemo(() => {
    const path = String(location?.pathname || "");
    return (
      path.startsWith(`/course/${courseId}/instructor/`) &&
      path !== `/course/${courseId}/instructor`
    );
  }, [location?.pathname]);

  const thread = useMemo(
    () => threads?.find((t) => String(t.threadId) === String(id)),
    [threads, id],
  );

  const [threadDetails, setThreadDetails] = useState(null);

  const threadDetailsPath = `/threads/${id}?courseId=${courseId}`;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    // If the thread isn't in the sidebar list (common on refresh/deep-link),
    // fetch its metadata so the title/status/name labels can still render.
    if (thread?.title) {
      setThreadDetails(null);
      return;
    }

    (async () => {
      try {
        const data = await apiFetch(threadDetailsPath);
        if (!cancelled) setThreadDetails(data?.thread || null);
      } catch {
        // Ignore: the messages request will show the auth/forbidden error.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, thread?.title, threadDetailsPath]);

  const t = thread || threadDetails;

  const title = t?.title || "Doubt";
  const isClosed = t?.status === "closed";
  const canToggleSolved = user?.role === "student";
  const canReply = useMemo(() => {
    if (!user) return false;
    if (isClosed) return false;
    if (user.role === "student") return true;
    if (user.role === "professor") return !!t?.isEscalatedToProfessor;
    return true; // ta (and any other non-student roles) can reply to open threads
  }, [user, isClosed, t?.isEscalatedToProfessor]);

  const replyPlaceholder = useMemo(() => {
    if (canReply) return "Type your message...";
    if (isClosed) return "This doubt is solved";
    if (user?.role === "professor") return "View only (not escalated)";
    return "You cannot reply";
  }, [canReply, isClosed, user?.role]);

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
  const bottomRef = useRef(null);

  const firstProfessorMessage = useMemo(() => {
    if (!t?.isEscalatedToProfessor) return null;
    const msg = messages.find((m) => m?.senderRole === "professor");
    return msg || null;
  }, [messages, t?.isEscalatedToProfessor]);

  const firstProfessorMessageId = firstProfessorMessage?.messageId ?? null;
  const professorIdentity = useMemo(() => {
    if (!t?.isEscalatedToProfessor) return "";
    if (user?.role === "professor") return user?.email || "Professor";
    return firstProfessorMessage?.senderEmail || "Professor";
  }, [
    t?.isEscalatedToProfessor,
    user?.role,
    user?.email,
    firstProfessorMessage?.senderEmail,
  ]);

  const professorDividerText = useMemo(() => {
    if (!professorIdentity) return "";
    if (professorIdentity === "Professor") return "Professor";
    return `${professorIdentity}`;
  }, [professorIdentity]);

  const leftTitleLabel = useMemo(() => {
    if (!user) return "";
    if (user.role === "student") {
      if (t?.isEscalatedToProfessor) {
        return professorIdentity || "Professor";
      }
      return t?.taEmail ? `${t.taEmail}` : "TA";
    }
    if (user.role === "ta" || user.role === "professor") {
      return t?.studentEmail ? `${t.studentEmail}` : "Student";
    }
    return "";
  }, [
    user,
    t?.taEmail,
    t?.studentEmail,
    t?.isEscalatedToProfessor,
    professorIdentity,
  ]);

  const professorTaLabel = useMemo(() => {
    if (user?.role !== "professor") return "";
    return t?.taEmail ? `${t.taEmail}` : "TA";
  }, [user?.role, t?.taEmail]);

  function goBackToDashboard() {
    nav(`/course/${courseId}/instructor`, { replace: false });
  }

  useEffect(() => {
    // Keep the newest messages visible on initial load and on new messages.
    // Using an anchor avoids brittle scrollHeight math.
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length, loaded]);

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
        body: { status: nextStatus, courseId },
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
    if (t?.isEscalatedToProfessor) return;
    if (isClosed) return;
    setShowEscalateConfirm(true);
  }
  async function confirmEscalateToProfessor() {
    try {
      setEscalating(true);
      setError("");
      setShowEscalateConfirm(false);
      await apiFetch(`/threads/${id}/escalate`, {
        method: "PATCH",
        body: { courseId },
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
      `/threads/${id}/messages?courseId=${courseId}&sinceId=${lastSeenIdRef.current}`,
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

        const data = await apiFetch(
          `/threads/${id}/messages?courseId=${courseId}`,
        );
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
  }, [id, nav, courseId]);

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
  }, [id, nav, loaded, courseId]);

  // send new messages
  async function handleSend() {
    if (!canReply) return;
    const content = input.trim();
    if (!content) return;

    try {
      setError("");

      const data = await apiFetch(`/threads/${id}/messages`, {
        method: "POST",
        body: { content, courseId },
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
        <div className="cd-titlebar__left">
          {isInstructorRoute ? (
            <button
              type="button"
              className="cd-backBtn"
              onClick={goBackToDashboard}
              title="Back to dashboard"
            >
              Back
            </button>
          ) : null}
          <div className="cd-titlebar__leftLabel" title={leftTitleLabel}>
            {leftTitleLabel}
          </div>
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
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "var(--ap-overlay)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                  }}
                >
                  <div
                    style={{
                      background: "var(--ap-surface)",
                      padding: "2rem",
                      borderRadius: 12,
                      boxShadow: "0 8px 28px rgba(0,0,0,0.4)",
                      minWidth: 320,
                      textAlign: "center",
                      color: "var(--ap-text)",
                      border: "1px solid var(--ap-border)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: 18,
                        color: "var(--ap-text)",
                      }}
                    >
                      Confirm Status Change
                    </div>
                    <div style={{ marginBottom: 18 }}>
                      Are you sure you want to mark this doubt as{" "}
                      {isClosed ? "unsolved" : "solved"}?
                    </div>
                    <button
                      style={{
                        background: "var(--ap-primary)",
                        color: "#2e2432",
                        fontWeight: 600,
                        fontSize: "1em",
                        padding: "0.6em 1.2em",
                        borderRadius: 8,
                        border: "1px solid var(--ap-primary-strong)",
                        marginRight: 12,
                        cursor: "pointer",
                      }}
                      onClick={confirmToggleSolved}
                    >
                      Yes
                    </button>
                    <button
                      style={{
                        background: "transparent",
                        color: "var(--ap-text)",
                        fontWeight: 600,
                        fontSize: "1em",
                        padding: "0.6em 1.2em",
                        borderRadius: 8,
                        border: "1px solid var(--ap-border-strong)",
                        cursor: "pointer",
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
                disabled={escalating || !!t?.isEscalatedToProfessor || isClosed}
                title={
                  t?.isEscalatedToProfessor
                    ? "Already escalated"
                    : isClosed
                      ? "Cannot escalate a solved doubt"
                      : "Escalate this doubt to the professor"
                }
              >
                {t?.isEscalatedToProfessor ? "Escalated" : "Escalate"}
              </button>
              {showEscalateConfirm && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "var(--ap-overlay)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                  }}
                >
                  <div
                    style={{
                      background: "var(--ap-surface)",
                      padding: "2rem",
                      borderRadius: 12,
                      boxShadow: "0 8px 28px rgba(0,0,0,0.4)",
                      minWidth: 320,
                      textAlign: "center",
                      color: "var(--ap-text)",
                      border: "1px solid var(--ap-border)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: 18,
                        color: "var(--ap-text)",
                      }}
                    >
                      Confirm Escalation
                    </div>
                    <div style={{ marginBottom: 18 }}>
                      Are you sure you want to escalate this doubt to the
                      professor?
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 13,
                          color: "var(--ap-muted)",
                        }}
                      >
                        This will hand off the doubt to the professor.
                      </div>
                    </div>
                    <button
                      style={{
                        background: "var(--ap-primary)",
                        color: "#2e2432",
                        fontWeight: 600,
                        fontSize: "1em",
                        padding: "0.6em 1.2em",
                        borderRadius: 8,
                        border: "1px solid var(--ap-primary-strong)",
                        marginRight: 12,
                        cursor: "pointer",
                      }}
                      onClick={confirmEscalateToProfessor}
                    >
                      Yes
                    </button>
                    <button
                      style={{
                        background: "transparent",
                        color: "var(--ap-text)",
                        fontWeight: 600,
                        fontSize: "1em",
                        padding: "0.6em 1.2em",
                        borderRadius: 8,
                        border: "1px solid var(--ap-border-strong)",
                        cursor: "pointer",
                      }}
                      onClick={cancelEscalateToProfessor}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : user?.role === "professor" ? (
            <div className="cd-titlebar__meta" title={professorTaLabel}>
              {professorTaLabel}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div style={{ color: "var(--ap-danger)", marginBottom: 12 }}>
          {error}
        </div>
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
            const taId = Number(t?.taId);
            const isUser =
              user?.role === "professor"
                ? senderId === taId || senderId === viewerId
                : senderId === viewerId;

            const showProfessorDivider =
              !!firstProfessorMessageId &&
              String(msg.messageId) === String(firstProfessorMessageId);

            return (
              <div
                key={msg.messageId}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                }}
              >
                {showProfessorDivider ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      margin: "10px 0 14px",
                      padding: "0 8px",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        height: 1,
                        background: "var(--ap-border-strong)",
                        flex: 1,
                      }}
                    />
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ap-muted)",
                        whiteSpace: "nowrap",
                      }}
                      title={professorIdentity}
                    >
                      {professorDividerText}
                    </div>
                    <div
                      style={{
                        height: 1,
                        background: "var(--ap-border-strong)",
                        flex: 1,
                      }}
                    />
                  </div>
                ) : null}

                <div
                  className={`chat-bubble ${isUser ? "user" : "bot"}`}
                  style={{
                    marginBottom: 8,
                    maxWidth: "70%",
                    alignSelf: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
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
