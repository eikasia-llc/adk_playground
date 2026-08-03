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
        <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-start" }}>
          {message.tools_called.map((t, i) => (
             <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "100%", maxWidth: "100%" }}>
               <span style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#64748b", padding: "0.2rem 0.5rem", borderRadius: "999px", border: "1px solid #e2e8f0", width: "fit-content" }}>
                 🛠️ {t}
               </span>
               {message.tool_outputs && message.tool_outputs[i] && (
                 <pre style={{ fontSize: "0.7rem", background: "#f8fafc", color: "#475569", padding: "0.5rem", borderRadius: "0.25rem", border: "1px solid #e2e8f0", overflowX: "auto", whiteSpace: "pre-wrap", margin: 0, maxWidth: "100%", maxHeight: "150px", overflowY: "auto" }}>
                   {message.tool_outputs[i].length > 500 ? message.tool_outputs[i].substring(0, 500) + "... (truncated)" : message.tool_outputs[i]}
                 </pre>
               )}
             </div>
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
