import { useState, useRef, useEffect } from "react";
import { BACKEND_URL } from "../config.js";

export default function Chat({ orderId }) {
  const [status, setStatus] = useState("loading"); // loading | locked | ready
  const [lockedReason, setLockedReason] = useState(null);
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const messagesRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const response = await fetch(`${BACKEND_URL}/chat/${orderId}/messages`);
        const result = await response.json();
        if (cancelled) return;

        if (!response.ok || !result.access || !result.access.allowed) {
          setLockedReason(result.access?.reason || null);
          setStatus("locked");
          return;
        }

        setDaysRemaining(result.access.daysRemaining);
        setMessages(result.messages || []);
        setStatus("ready");
      } catch (err) {
        console.error("Chat init failed:", err);
        if (!cancelled) setStatus("locked");
      }
    }
    init();
    return () => { cancelled = true; };
  }, [orderId]);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const message = input.trim();
    if (!message) return;

    setChatError("");
    setSending(true);
    setMessages(m => [...m, { role: "user", content: message }]);
    setInput("");

    try {
      const response = await fetch(`${BACKEND_URL}/chat/${orderId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const result = await response.json();

      if (!response.ok) {
        setChatError(result.message || "Couldn't send your message. Please try again.");
        if (result.messages) setMessages(result.messages);
      } else {
        setMessages(result.messages);
        if (result.access) setDaysRemaining(result.access.daysRemaining);
      }
    } catch (err) {
      console.error("Send message failed:", err);
      setChatError("Couldn't send your message. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (status === "loading") return null;

  if (status === "locked") {
    return (
      <div className="chat-widget chat-locked" style={{ display: "block" }}>
        <p>{lockedReason === "expired"
          ? "Your 30-day chat inbox has expired. Contact us directly for further questions."
          : "Chat inbox is not available for this order."}</p>
      </div>
    );
  }

  return (
    <div className="chat-widget" style={{ display: "block" }}>
      <div className="chat-header">
        <h4>Ask about your Vastu report</h4>
        <span className="chat-expiry">{daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining</span>
      </div>
      <div className="chat-messages" ref={messagesRef}>
        {messages.length === 0
          ? <div className="chat-bubble system">Ask anything about your Vastu report, entrance direction, remedies, and more.</div>
          : messages.map((m, i) => (
              <div className={`chat-bubble ${m.role === "user" ? "user" : "assistant"}`} key={i}>{m.content}</div>
            ))}
      </div>
      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          type="text" placeholder="Ask a question about your property…" autoComplete="off" required
          value={input} disabled={sending}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit" disabled={sending}>Send</button>
      </form>
      {chatError && <p className="chat-error" style={{ display: "block" }}>{chatError}</p>}
    </div>
  );
}
