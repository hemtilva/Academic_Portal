import React, { useState } from "react";
import "./ChatDemo.css";

const demoMessages = [
  { id: 1, text: "Hi there! How can I help you today?", sender: "bot" },
  { id: 2, text: "I have a question about my assignment.", sender: "user" },
  { id: 3, text: "Sure! Please share your question.", sender: "bot" },
  { id: 4, text: "What is the deadline for submission?", sender: "user" },
  { id: 5, text: "The deadline is next Friday.", sender: "bot" },
];

export default function ChatDemo() {
  const [messages, setMessages] = useState(demoMessages);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { id: messages.length + 1, text: input, sender: "user" }]);
      setInput("");
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-bubbles">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble ${msg.sender === "user" ? "user" : "bot"}`}
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
    </div>
  );
}
