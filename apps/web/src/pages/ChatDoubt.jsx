import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./StudentDoubts.css";

export default function ChatDoubt() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const storedUser = localStorage.getItem("ap_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);
  const doubts = [
    { id: 1, title: "Doubt 1", resolved: false },
    { id: 2, title: "Doubt 2", resolved: true },
    { id: 3, title: "Doubt 3", resolved: false },
  ];
  const title = doubts.find(d => String(d.id) === id)?.title || "Doubt";

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
      const newMsg = { id: currentMessages.length + 1, text: input, sender: "user" };
      setMessagesByDoubt({
        ...messagesByDoubt,
        [id]: [...currentMessages, newMsg],
      });
      setInput("");
    }
  };

  return (
    <div className="sd-container">
      <div className="sd-sidebar">
        <div className="sd-header">
          <div className="sd-avatar" />
          <span>{user?.name || "Student-1"}</span>
        </div>
        <div className="sd-nav">
          <a href="/login">Logout</a>
        </div>
        <div className="sd-doubtList">
          {doubts.map((doubt) => (
            <Link
              key={doubt.id}
              to={`/doubts/${doubt.id}`}
              className="sd-doubtItem"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <span>{doubt.title}</span>
              <div
                className={`sd-status ${
                  doubt.resolved ? "resolved" : "unresolved"
                }`}
              />
            </Link>
          ))}
        </div>
      </div>
      <div className="sd-chatArea">
        <div style={{
          width: '100%',
          background: '#0f0f0f',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '36px',
          fontWeight: 600,
          fontSize: '1.15rem',
          marginBottom: '12px',
          borderRadius: '0',
        }}>
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
      </div>
    </div>
  );
}
