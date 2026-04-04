"use client";

import { useState, useCallback, useRef } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type A2UIComponent =
  | { type: "text"; value: string }
  | { type: "button"; label: string; action: string }
  | { type: "card"; title: string; subtitle?: string; body: A2UIComponent[] }
  | { type: "list"; items: string[] }
  | { type: "rps_selector"; prompt?: string }
  | { type: "sealed_box"; label?: string };

export type Message = {
  id: string;
  role: "user" | "assistant";
  type: "text" | "a2ui";
  content: string | { components: A2UIComponent[] };
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  const addMessage = (msg: Omit<Message, "id">) =>
    setMessages((prev) => [
      ...prev,
      { ...msg, id: crypto.randomUUID() },
    ]);

  // ---- Single-turn (POST /chat) ----
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    addMessage({ role: "user", type: "text", content: text });
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionIdRef.current ?? undefined,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Persist session_id for the conversation
      if (data.session_id) sessionIdRef.current = data.session_id;

      if (data.type === "a2ui") {
        addMessage({ role: "assistant", type: "a2ui", content: data.payload });
      } else {
        addMessage({ role: "assistant", type: "text", content: data.text ?? "" });
      }
    } catch (err) {
      addMessage({
        role: "assistant",
        type: "text",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Streaming (GET /stream via SSE) ----
  const sendMessageStream = useCallback(async (text: string) => {
    if (!text.trim()) return;
    addMessage({ role: "user", type: "text", content: text });
    setLoading(true);

    // Placeholder message that gets updated as chunks arrive
    const placeholderId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: placeholderId, role: "assistant", type: "text", content: "" },
    ]);

    const params = new URLSearchParams({
      message: text,
      ...(sessionIdRef.current ? { session_id: sessionIdRef.current } : {}),
    });

    try {
      const res = await fetch(`${BACKEND_URL}/stream?${params}`);
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;

          try {
            const event = JSON.parse(raw);
            if (event.type === "session" && event.session_id) {
              sessionIdRef.current = event.session_id;
            } else if (event.type === "chunk" && event.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId
                    ? { ...m, content: (m.content as string) + event.text }
                    : m
                )
              );
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return { messages, loading, sendMessage, sendMessageStream };
}
