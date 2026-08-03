"use client";

import type { Message } from "@/hooks/useChat";
import A2UIRenderer from "./A2UIRenderer";

interface MessageBubbleProps {
  message: Message;
  onAction?: (action: string) => void;
}

export default function MessageBubble({ message, onAction }: MessageBubbleProps) {
  const { role, type, content } = message;

  return (
    <div className={`message ${role}`}>
      {type === "a2ui" ? (
        <A2UIRenderer
          payload={content as { components: never[] }}
          onAction={onAction}
        />
      ) : (
        <span>{content as string}</span>
      )}
      {message.tools_called && message.tools_called.length > 0 && (
        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
          {message.tools_called.map((t, i) => (
             <span key={i} style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#64748b", padding: "0.2rem 0.5rem", borderRadius: "999px", border: "1px solid #e2e8f0" }}>
               🛠️ {t}
             </span>
          ))}
        </div>
      )}
      {message.source === "a2ui_submit" && (
        <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "flex-end" }}>
          <span style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.2)", color: "#fff", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>
            Sent to Chatty (LLM) 🚀
          </span>
        </div>
      )}
    </div>
  );
}
