"use client";

import type { Message } from "@/hooks/useChat";
import A2UIRenderer from "./A2UIRenderer";

interface MessageBubbleProps {
  message: Message;
  onAction?: (action: string) => void;
}

export default function MessageBubble({ message, onAction }: MessageBubbleProps) {
  const { role, type, content } = message;

  // Don't render empty placeholder bubbles until chunks arrive
  if (role === "assistant" && type === "text" && (!content || content === "")) {
    return null;
  }

  return (
    <div className={`message-row ${role}`}>
      <div className={`message-avatar ${role === "user" ? "user-avatar" : "fairy-avatar"}`}>
        {role === "user" ? "🧙‍♂️" : "🧚"}
      </div>

      <div className="message-content-wrapper" style={{ maxWidth: "100%" }}>
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
            <div className="tool-runes-container">
              {message.tools_called.map((t, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "100%" }}>
                  <span className="tool-rune-badge">
                    🔮 {t}
                  </span>
                  {message.tool_outputs && message.tool_outputs[i] && (
                    <pre className="tool-output-scroll">
                      {message.tool_outputs[i].length > 500
                        ? message.tool_outputs[i].substring(0, 500) + "... (truncated)"
                        : message.tool_outputs[i]}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {message.source === "a2ui_submit" && (
            <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "flex-end" }}>
              <span className="a2ui-submit-tag">
                ✦ Dispatched to Chatty ✨
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
