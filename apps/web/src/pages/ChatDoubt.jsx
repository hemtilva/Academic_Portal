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
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const lastSeenIdRef = useRef(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Reset transient UI when switching threads.
    setContextMenu(null);
    setSelectedMessage(null);
    setShowEditModal(false);
    setShowDeleteConfirm(false);
    setEditDraft("");
  }, [id]);

  useEffect(() => {
    if (!contextMenu) return;

    function onKeyDown(e) {
      if (e.key === "Escape") setContextMenu(null);
    }

    function onOutsideClick() {
      setContextMenu(null);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onOutsideClick);
    window.addEventListener("scroll", onOutsideClick, true);
    window.addEventListener("resize", onOutsideClick);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onOutsideClick);
      window.removeEventListener("scroll", onOutsideClick, true);
      window.removeEventListener("resize", onOutsideClick);
    };
  }, [contextMenu]);

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

  function formatMessageTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    try {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return d.toLocaleTimeString();
    }
  }

  function getMinuteKey(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return [
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
    ].join("-");
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

  function openContextMenu(e, msg) {
    if (!msg) return;
    e.preventDefault();
    e.stopPropagation();

    setSelectedMessage(msg);

    const menuWidth = 160;
    const menuHeight = 88;
    const maxX = Math.max(8, (window.innerWidth || 0) - menuWidth - 8);
    const maxY = Math.max(8, (window.innerHeight || 0) - menuHeight - 8);
    const x = Math.min(Math.max(8, e.clientX), maxX);
    const y = Math.min(Math.max(8, e.clientY), maxY);

    setContextMenu({ x, y });
  }

  function startEditSelectedMessage() {
    if (!selectedMessage) return;
    setEditDraft(String(selectedMessage.content || ""));
    setShowEditModal(true);
    setContextMenu(null);
  }

  async function confirmEditSelectedMessage() {
    if (!id || !selectedMessage?.messageId) return;
    if (isClosed) return;

    try {
      setSavingEdit(true);
      setError("");

      const data = await apiFetch(
        `/threads/${id}/messages/${selectedMessage.messageId}?courseId=${courseId}`,
        {
          method: "PATCH",
          body: { content: editDraft, courseId },
        },
      );

      const updated = data?.message;
      if (updated?.messageId) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.messageId) === String(updated.messageId) ? updated : m,
          ),
        );
        setSelectedMessage(updated);
      }

      setShowEditModal(false);
    } catch (e) {
      const msg = e?.message || "Failed to edit message";
      setError(msg);
      if (String(msg).toLowerCase().includes("unauthorized")) {
        nav("/login", { replace: true });
      }
    } finally {
      setSavingEdit(false);
    }
  }

  function cancelEditSelectedMessage() {
    setShowEditModal(false);
  }

  function startDeleteSelectedMessage() {
    if (!selectedMessage) return;
    setShowDeleteConfirm(true);
    setContextMenu(null);
  }

  async function confirmDeleteSelectedMessage() {
    if (!id || !selectedMessage?.messageId) return;
    if (isClosed) return;

    try {
      setDeletingMessage(true);
      setError("");

      const data = await apiFetch(
        `/threads/${id}/messages/${selectedMessage.messageId}?courseId=${courseId}`,
        { method: "DELETE" },
      );

      if (data?.threadDeleted) {
        setShowDeleteConfirm(false);
        setSelectedMessage(null);
        if (typeof reloadThreads === "function") {
          await reloadThreads();
        }
        if (isInstructorRoute) {
          nav(`/course/${courseId}/instructor`, { replace: true });
        } else {
          nav(`/course/${courseId}/doubts`, { replace: true });
        }
        return;
      }

      const deletedMessage = data?.message;
      if (deletedMessage?.messageId) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.messageId) === String(deletedMessage.messageId)
              ? deletedMessage
              : m,
          ),
        );
      } else {
        // Fallback: remove from UI if API didn't return the updated row.
        setMessages((prev) =>
          prev.filter(
            (m) => String(m.messageId) !== String(selectedMessage.messageId),
          ),
        );
      }
      setShowDeleteConfirm(false);
      setSelectedMessage(null);
    } catch (e) {
      const msg = e?.message || "Failed to delete message";
      setError(msg);
      if (String(msg).toLowerCase().includes("unauthorized")) {
        nav("/login", { replace: true });
      }
    } finally {
      setDeletingMessage(false);
    }
  }

  function cancelDeleteSelectedMessage() {
    setShowDeleteConfirm(false);
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
            </>
          ) : user?.role === "professor" ? (
            <div className="cd-titlebar__meta" title={professorTaLabel}>
              {professorTaLabel}
            </div>
          ) : null}
        </div>
      </div>

      {showSolvedConfirm && (
        <div className="sd-modalOverlay" role="dialog" aria-modal="true">
          <div className="sd-modalCard">
            <div className="sd-modalTitle">Confirm Status Change</div>
            <div className="sd-modalBody">
              Are you sure you want to mark this doubt as{" "}
              {isClosed ? "unsolved" : "solved"}?
            </div>
            <div className="sd-modalActions">
              <button
                type="button"
                className="sd-modalBtn is-primary"
                onClick={confirmToggleSolved}
              >
                Yes
              </button>
              <button
                type="button"
                className="sd-modalBtn is-accent"
                onClick={cancelToggleSolved}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEscalateConfirm && (
        <div className="sd-modalOverlay" role="dialog" aria-modal="true">
          <div className="sd-modalCard">
            <div className="sd-modalTitle">Confirm Escalation</div>
            <div className="sd-modalBody">
              Are you sure you want to escalate this doubt to the professor?
              <div className="cd-escalateNote">
                This will hand off the doubt to the professor.
              </div>
            </div>
            <div className="sd-modalActions">
              <button
                type="button"
                className="sd-modalBtn is-primary"
                onClick={confirmEscalateToProfessor}
              >
                Yes
              </button>
              <button
                type="button"
                className="sd-modalBtn is-accent"
                onClick={cancelEscalateToProfessor}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {error ? <div className="cd-error">{error}</div> : null}

      <div className="chat-bubbles chat-bubbles--withFooterMargin">
        {loading ? (
          <div className="cd-chatState">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="cd-chatState">No messages yet.</div>
        ) : (
          messages.map((msg, idx) => {
            const senderId = Number(msg.senderId);
            const viewerId = Number(user?.id);
            const taId = Number(t?.taId);
            const isUser =
              user?.role === "professor"
                ? senderId === taId || senderId === viewerId
                : senderId === viewerId;

            const canModifyMessage =
              !isClosed && senderId === viewerId && !loading && !msg?.deletedAt;

            const showEdited = !!msg?.editedAt && !msg?.deletedAt;
            const showDeleted = !!msg?.deletedAt;

            const messageTime = formatMessageTime(msg?.createdAt);
            const watermarkText = showDeleted
              ? "deleted"
              : showEdited
                ? "edited"
                : "";

            const nextMsg = messages[idx + 1];
            const prevMsg = messages[idx - 1];
            const sameSenderAsNext =
              !!nextMsg &&
              String(nextMsg?.senderId) === String(msg?.senderId) &&
              String(nextMsg?.senderRole || "") ===
                String(msg?.senderRole || "");
            const sameSenderAsPrev =
              !!prevMsg &&
              String(prevMsg?.senderId) === String(msg?.senderId) &&
              String(prevMsg?.senderRole || "") ===
                String(msg?.senderRole || "");
            const sameMinuteAsNext =
              !!nextMsg &&
              getMinuteKey(nextMsg?.createdAt) === getMinuteKey(msg?.createdAt);
            const sameMinuteAsPrev =
              !!prevMsg &&
              getMinuteKey(prevMsg?.createdAt) === getMinuteKey(msg?.createdAt);
            const showTimestamp =
              !!messageTime && !(sameSenderAsNext && sameMinuteAsNext);
            const isGroupedWithNext = sameSenderAsNext && sameMinuteAsNext;
            const isGroupedWithPrev = sameSenderAsPrev && sameMinuteAsPrev;

            const showProfessorDivider =
              !!firstProfessorMessageId &&
              String(msg.messageId) === String(firstProfessorMessageId);

            return (
              <div key={msg.messageId} className="cd-messageRow">
                {showProfessorDivider ? (
                  <div className="cd-profDivider">
                    <div className="cd-profDividerLine" />
                    <div
                      className="cd-profDividerText"
                      title={professorIdentity}
                    >
                      {professorDividerText}
                    </div>
                    <div className="cd-profDividerLine" />
                  </div>
                ) : null}

                <div
                  className={`cd-messageWrap ${
                    isUser ? "is-user" : "is-peer"
                  } ${isGroupedWithNext ? "is-grouped-next" : ""} ${
                    isGroupedWithPrev ? "is-grouped-prev" : ""
                  }`}
                >
                  <div
                    className={`chat-bubble ${isUser ? "user" : "bot"} ${
                      isGroupedWithNext
                        ? isUser
                          ? "is-grouped-next-user"
                          : "is-grouped-next-peer"
                        : ""
                    }`}
                    onContextMenu={
                      canModifyMessage
                        ? (e) => openContextMenu(e, msg)
                        : undefined
                    }
                  >
                    <div className="cd-messageContent">
                      {showDeleted ? (
                        <span className="cd-messageDeleted">
                          Message deleted
                        </span>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>

                  {showTimestamp ? (
                    <div
                      className={`cd-messageMeta ${isUser ? "is-user" : "is-peer"}`}
                      title={msg?.createdAt}
                    >
                      {watermarkText
                        ? `${watermarkText} • ${messageTime}`
                        : messageTime}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {contextMenu && selectedMessage ? (
        <div
          role="menu"
          aria-label="Message actions"
          className="cd-contextMenu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={startEditSelectedMessage}
            className="cd-contextMenuBtn"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={startDeleteSelectedMessage}
            className="cd-contextMenuBtn is-danger"
          >
            Delete
          </button>
        </div>
      ) : null}

      {showEditModal ? (
        <div className="sd-modalOverlay" role="dialog" aria-modal="true">
          <div className="sd-modalCard">
            <div className="sd-modalTitle">Edit message</div>
            <div className="sd-modalBody">
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={4}
                className="cd-editTextarea"
              />
            </div>
            <div className="sd-modalActions">
              <button
                type="button"
                className="sd-modalBtn is-primary"
                onClick={confirmEditSelectedMessage}
                disabled={savingEdit}
              >
                Save
              </button>
              <button
                type="button"
                className="sd-modalBtn is-accent"
                onClick={cancelEditSelectedMessage}
                disabled={savingEdit}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div className="sd-modalOverlay" role="dialog" aria-modal="true">
          <div className="sd-modalCard">
            <div className="sd-modalTitle">Delete message</div>
            <div className="sd-modalBody">
              Are you sure you want to delete this message?
            </div>
            <div className="sd-modalActions">
              <button
                type="button"
                className="sd-modalBtn is-primary"
                onClick={confirmDeleteSelectedMessage}
                disabled={deletingMessage}
              >
                Yes
              </button>
              <button
                type="button"
                className="sd-modalBtn is-accent"
                onClick={cancelDeleteSelectedMessage}
                disabled={deletingMessage}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
