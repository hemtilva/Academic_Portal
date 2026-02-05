const express = require("express");

const app = express();
const PORT = 3001;
app.use(express.json());

const messages = [];
let nextMessageId = 1;

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

app.post("/messages", (req, res) => {
    const {threadId, sender, text} = req.body;

    if(!threadId || typeof threadId !== "string"){
        return res.status(400).json({error : "threadId (string) is required"});
    }

    if(!sender || typeof sender !== "string"){
        return res.status(400).json({error : "sender (string) is required"});
    }

    if(!text || typeof text !== "string"){
        return res.status(400).json({error : "text (string) is required"});
    }

    const message = {
        id: nextMessageId++,
        threadId,
        sender,
        text,
        createdAt: new Date().toISOString()
    };

    messages.push(message);
    res.status(201).json(message);
});

app.get("/messages", (req, res) => {
    const { threadId, sinceId} = req.query;

    let result = messages;

    if (typeof threadId === "string" && threadId.length > 0) {
        result = result.filter((m) => m.threadId === threadId);
    }

    if (typeof sinceId === "string" && sinceId.length > 0) {
        const since = Number(sinceId);
        if (!Number.isNaN(since)) {
            result = result.filter((m) => m.id > since);
        }
    }

    res.json(result);
})