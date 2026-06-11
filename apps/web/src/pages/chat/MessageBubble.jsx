import React from "react";

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

export default function MessageBubble(props) {
  const {
    msg,
    idx,
    messages,
    user,
    t,
    activeRole,
    isClosed,
    loading,
    firstProfessorMessageId,
    professorIdentity,
    professorDividerText,
    openContextMenu,
    formatMessageTime,
  } = props;

  const senderId = Number(msg.senderId);
  const viewerId = Number(user?.id);
  const taId = Number(t?.taId);
  const isUser =
    activeRole === "professor"
      ? senderId === taId || senderId === viewerId
      : senderId === viewerId;

  const canModifyMessage =
    !isClosed && senderId === viewerId && !loading && !msg?.deletedAt;

  const showEdited = !!msg?.editedAt && !msg?.deletedAt;
  const showDeleted = !!msg?.deletedAt;

  const messageTime = formatMessageTime(msg?.createdAt);
  const watermarkText = showDeleted ? "deleted" : showEdited ? "edited" : "";

  const nextMsg = messages[idx + 1];
  const prevMsg = messages[idx - 1];
  const sameSenderAsNext =
    !!nextMsg &&
    String(nextMsg?.senderId) === String(msg?.senderId) &&
    String(nextMsg?.senderRole || "") === String(msg?.senderRole || "");
  const sameSenderAsPrev =
    !!prevMsg &&
    String(prevMsg?.senderId) === String(msg?.senderId) &&
    String(prevMsg?.senderRole || "") === String(msg?.senderRole || "");
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
          <div className="cd-profDividerText" title={professorIdentity}>
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
            canModifyMessage ? (e) => openContextMenu(e, msg) : undefined
          }
        >
          <div className="cd-messageContent">
            {showDeleted ? (
              <span className="cd-messageDeleted">Message deleted</span>
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
            {watermarkText ? `${watermarkText} • ${messageTime}` : messageTime}
          </div>
        ) : null}
      </div>
    </div>
  );
}
