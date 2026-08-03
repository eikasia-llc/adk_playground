"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import MessageBubble from "./MessageBubble";

export default function ChatWindow() {
  const [input, setInput] = useState("");
  // Toggle between single-turn (/chat) and streaming (/stream)
  const [streamMode, setStreamMode] = useState(false);
  const { messages, loading, activeTools, sendMessage, sendMessageStream, clearChat } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    if (streamMode) {
      await sendMessageStream(text);
    } else {
      await sendMessage(text);
    }
  };

  // A2UI button actions route through the same pipeline
  const handleAction = async (action: string) => {
    if (streamMode) {
      await sendMessageStream(action, "a2ui_submit");
    } else {
      await sendMessage(action);
    }
  };

  return (
    <div className="chat-window">
      {/* Header */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #e5e5e5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>A2UI Template Chatbot - Testing</strong>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button 
            onClick={clearChat} 
            style={{ 
              padding: "0.3rem 0.6rem", 
              fontSize: "0.85rem", 
              background: "#e2e8f0", 
              color: "#333", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Restart
          </button>
          <label style={{ fontSize: "0.85rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={streamMode}
              onChange={(e) => setStreamMode(e.target.checked)}
              style={{ marginRight: "0.4rem" }}
            />
            Streaming
          </label>
        </div>
      </div>

      {/* Message list */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <p style={{ color: "#999", textAlign: "center", marginTop: "2rem" }}>
            Send a message to get started.
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onAction={handleAction} />
        ))}
        {loading && (
          <div className="message assistant" style={{ opacity: 0.8, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: activeTools.length > 0 ? "0.5rem" : "0" }}>
              <div className="spinner" style={{ width: "12px", height: "12px", border: "2px solid #cbd5e1", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <span style={{ color: "#475569", fontWeight: 500 }}>Chatty is thinking...</span>
            </div>
            {activeTools.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.5rem" }}>
                {activeTools.map((tool, idx) => (
                  <div key={idx} style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span>⚙️</span> Calling {tool}...
                  </div>
                ))}
              </div>
            )}
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
