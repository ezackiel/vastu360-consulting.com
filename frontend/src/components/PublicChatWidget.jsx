import { useState, useRef, useEffect } from "react";
import { BACKEND_URL } from "../config.js";

const SESSION_KEY = "vastu360_public_chat_session";

function getOrCreateSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = "pub-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (private browsing etc.) — fall back to an
    // in-memory id that resets each page load.
    return "pub-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
}

export default function PublicChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loadedHistory, setLoadedHistory] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    if (open && !sessionId) setSessionId(getOrCreateSessionId());
  }, [open, sessionId]);

  useEffect(() => {
    if (!sessionId || loadedHistory) return;
    let cancelled = false;
    async function loadHistory() {
      try {
        const response = await fetch(`${BACKEND_URL}/public-chat/${sessionId}/messages`);
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled) setMessages(result.messages || []);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        if (!cancelled) setLoadedHistory(true);
      }
    }
    loadHistory();
    return () => { cancelled = true; };
  }, [sessionId, loadedHistory]);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, open]);

  async function handleSend(e) {
    e.preventDefault();
    const message = input.trim();
    if (!message || !sessionId) return;

    setError("");
    setSending(true);
    setMessages(m => [...m, { role: "user", content: message }]);
    setInput("");

    try {
      const response = await fetch(`${BACKEND_URL}/public-chat/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Couldn't send your message. Please try again.");
        if (result.messages) setMessages(result.messages);
      } else {
        setMessages(result.messages);
      }
    } catch (err) {
      console.error("Send message failed:", err);
      setError("Couldn't send your message. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="public-chat-panel">
          <div className="chat-header">
            <h4>Ask Vastu360</h4>
            <button
              type="button"
              className="public-chat-close"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="chat-messages" ref={messagesRef}>
            {messages.length === 0 ? (
              <div className="chat-bubble system">
                Ask us anything about Vastu Shastra, or how a Vastu360 audit works — a
                property-specific answer needs a booking, but general questions are on us.
              </div>
            ) : (
              messages.map((m, i) => (
                <div className={`chat-bubble ${m.role === "user" ? "user" : "assistant"}`} key={i}>
                  {m.content}
                </div>
              ))
            )}
          </div>
          <form className="chat-input-row" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask a Vastu question…"
              autoComplete="off"
              required
              value={input}
              disabled={sending}
              onChange={e => setInput(e.target.value)}
            />
            <button type="submit" disabled={sending}>{sending ? "…" : "Send"}</button>
          </form>
          {error && <p className="chat-error" style={{ display: "block" }}>{error}</p>}
        </div>
      )}

      <button
        type="button"
        className="public-chat-fab"
        aria-label={open ? "Close Vastu chat" : "Ask a Vastu question"}
        onClick={() => setOpen(o => !o)}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
        )}
      </button>
    </>
  );
}
