"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import MessageBubble from "./MessageBubble";

export default function ChatWindow() {
  const [input, setInput] = useState("");
  // Toggle between single-turn (/chat) and streaming (/stream)
  const [streamMode, setStreamMode] = useState(true);
  const { messages, loading, activeTools, sendMessage, sendMessageStream, clearChat } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Trigger background warmup on mount to wake up Cloud Run & preheat MCP server
  useEffect(() => {
    fetch("/api/warmup").catch(() => {
      // Non-blocking background warmup; catch quietly
    });
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

  const handleQuickPrompt = async (promptText: string) => {
    if (loading) return;
    if (streamMode) {
      await sendMessageStream(promptText);
    } else {
      await sendMessage(promptText);
    }
  };

  // A2UI button actions route through the streaming pipeline for live tool observation
  const handleAction = async (action: string) => {
    await sendMessageStream(action, "a2ui_submit");
  };

  return (
    <div className="chat-window">
      {/* Enchanted Header */}
      <header className="chat-header">
        <div className="chat-header-title-group">
          <div className="fairy-avatar-aura">🧚</div>
          <div className="chat-header-titles">
            <h1 className="chat-header-name">Chatty&apos;s Sanctum</h1>
            <span className="chat-header-subtitle">
              <span>✦</span> Fae Guide to A2UI Spells &amp; Interactive Arcana
            </span>
          </div>
        </div>

        <div className="chat-header-actions">
          <button 
            onClick={clearChat} 
            className="ritual-reset-btn"
            title="Cleanse the circle and start a fresh journey"
          >
            <span>✧</span> Cleansing Ritual
          </button>
          <label className="stream-toggle-label" title="Stream responses in real-time">
            <input
              type="checkbox"
              checked={streamMode}
              onChange={(e) => setStreamMode(e.target.checked)}
            />
            Arcane Stream ⚡
          </label>
        </div>
      </header>

      {/* Message List */}
      <main className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-hero">
            <div className="welcome-fairy-icon">🧚✨</div>
            <h2 className="welcome-title">Welcome, Mortal Apprentice</h2>
            <p className="welcome-description">
              I am Chatty, guardian of whimsical wonders and conjurer of rich A2UI components!
              Speak thy mind, practice ancient duels, or study the spells in my grimoire.
            </p>

            <div className="quick-spells-container">
              <div className="quick-spells-title">
                <span>✦</span> Choose an Initial Spell <span>✦</span>
              </div>
              <div className="quick-spells-grid">
                <button
                  className="quick-spell-chip"
                  onClick={() => handleQuickPrompt("Let's play Rock-Paper-Scissors! 🪨📄✂️")}
                >
                  <span className="quick-spell-chip-icon">🪨</span>
                  <span>
                    <strong>Duel of Rock-Paper-Scissors</strong><br />
                    <small style={{ color: "#94a3b8" }}>Test thy wits against my sealed ward</small>
                  </span>
                </button>

                <button
                  className="quick-spell-chip"
                  onClick={() => handleQuickPrompt("Teach me about your A2UI spells and components! ✨")}
                >
                  <span className="quick-spell-chip-icon">✨</span>
                  <span>
                    <strong>The Spellbook Curriculum</strong><br />
                    <small style={{ color: "#94a3b8" }}>Explore the secrets of UI arcana</small>
                  </span>
                </button>

                <button
                  className="quick-spell-chip"
                  onClick={() => handleQuickPrompt("Show me the Scroll of Incantations (text input) 📜")}
                >
                  <span className="quick-spell-chip-icon">📜</span>
                  <span>
                    <strong>The Scroll of Incantations</strong><br />
                    <small style={{ color: "#94a3b8" }}>Conjure interactive inputs &amp; sliders</small>
                  </span>
                </button>

                <button
                  className="quick-spell-chip"
                  onClick={() => handleQuickPrompt("What are our duel stats and score? 📊")}
                >
                  <span className="quick-spell-chip-icon">📊</span>
                  <span>
                    <strong>Celestial Scoreboard</strong><br />
                    <small style={{ color: "#94a3b8" }}>Consult the chart of victories &amp; draws</small>
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onAction={handleAction} />
        ))}

        {loading && (
          <div className="message-row assistant">
            <div className="message-avatar fairy-avatar">🧚</div>
            <div className="casting-indicator">
              <div className="casting-orb" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <span className="casting-text">
                  Chatty is channeling magical energy... ✨
                </span>
                {activeTools.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.2rem" }}>
                    {activeTools.map((tool, idx) => (
                      <span key={idx} className="tool-rune-badge">
                        🔮 Weaving {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Enchanted Input Bar */}
      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <div className="chat-input-wrapper">
          <input
            type="text"
            placeholder="Inscribe a message or invoke a spell…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>
        <button 
          type="submit" 
          className="cast-spell-btn"
          disabled={loading || !input.trim()}
        >
          <span>Cast</span>
          <span>🪄</span>
        </button>
      </form>
    </div>
  );
}
