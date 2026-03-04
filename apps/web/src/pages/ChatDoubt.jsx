import { useOutletContext, useParams } from "react-router-dom";
import { useMemo, useState } from "react";

export default function ChatDoubt() {
  const { id } = useParams();
  const { doubts } = useOutletContext();
  const title = useMemo(
    () => doubts.find((d) => String(d.id) === id)?.title || "Doubt",
    [doubts, id],
  );

  // Store messages for each doubt in an object
  const initialMessages = {
    1: [
      { id: 1, text: "Hello! What's your doubt?", sender: "bot" },
      { id: 2, text: "I need help with Doubt 1.", sender: "user" },
      { id: 3, text: "Sure, please describe your issue.", sender: "bot" },
    ],
    2: [
      { id: 1, text: "Hi! Doubt 2 here.", sender: "bot" },
      { id: 2, text: "Can you help with Doubt 2?", sender: "user" },
      { id: 3, text: "Of course, what's the problem?", sender: "bot" },
    ],
    3: [
      { id: 1, text: "Welcome to Doubt 3 chat.", sender: "bot" },
      { id: 2, text: "I have a question about Doubt 3.", sender: "user" },
      { id: 3, text: "Go ahead and ask!", sender: "bot" },
    ],
  };
  const [messagesByDoubt, setMessagesByDoubt] = useState(initialMessages);
  const [input, setInput] = useState("");

  // Get messages for current doubt
  const currentMessages = messagesByDoubt[id] || [];

  const handleSend = () => {
    if (input.trim()) {
      const newMsg = {
        id: currentMessages.length + 1,
        text: input,
        sender: "user",
      };
      setMessagesByDoubt({
        ...messagesByDoubt,
        [id]: [...currentMessages, newMsg],
      });
      setInput("");
    }
  };

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

      <div className="chat-bubbles" style={{ marginBottom: 16 }}>
        {currentMessages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble ${msg.sender === "user" ? "user" : "bot"}`}
            style={{ marginBottom: 8 }}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </>
  );
}
