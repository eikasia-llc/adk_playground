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
    </div>
  );
}
