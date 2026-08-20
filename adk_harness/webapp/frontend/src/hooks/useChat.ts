"use client";

import { useState, useCallback, useRef } from "react";

// All backend traffic flows through the Next.js server-side proxy routes
// (src/app/api/chat, src/app/api/stream). The browser never calls Cloud Run
// directly; the Next.js server mints OIDC ID tokens for the IAM-locked
// backend. See INFRASTRUCTURE_CHATBOT_TEMPLATE_REF.md for the auth flow.
const API_BASE = "/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type A2UIComponent =
  | { type: "text"; value: string }
  | { type: "button"; label: string; action: string }
  | { type: "card"; title: string; subtitle?: string; body: A2UIComponent[] }
  | { type: "list"; items: string[] }
  | { type: "rps_selector"; prompt?: string }
  | { type: "sealed_box"; label?: string }
  | { type: "text_input"; label?: string; placeholder?: string; input_type?: string; required?: boolean; default_value?: string }
  | { type: "slider"; label?: string; min_value: number; max_value: number; step?: number; default_value?: number }
  | { type: "dropdown"; label?: string; options: { label: string; value: string }[]; default_value?: string }
  | { type: "checkbox_group"; group_label?: string; options: { label: string; value: string; checked?: boolean }[] }
  | { type: "mutation_form"; title?: string; fields: any[] }
  | { type: "approval_card"; prompt: string; mutation_payload: any }
  | { type: "filter_bar"; filters: any[] }
  | { type: "chart"; chart_type: "bar" | "line" | "pie"; title?: string; x_axis_label?: string; y_axis_label?: string; data: { label: string; value: number }[] };

export type Message = {
  id: string;
  role: "user" | "assistant";
  type: "text" | "a2ui";
  content: string | { components: A2UIComponent[] };
  tools_called?: string[];
  tool_outputs?: string[];
  source?: "a2ui_submit" | "user_input";
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  const addMessage = (msg: Omit<Message, "id">) =>
    setMessages((prev) => [
      ...prev,
      { ...msg, id: crypto.randomUUID() },
    ]);

  // ---- Single-turn (POST /chat) ----
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    addMessage({ role: "user", type: "text", content: text, source: "user_input" });
    setLoading(true);
    setActiveTools([]);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
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
        addMessage({ role: "assistant", type: "a2ui", content: data.payload, tools_called: data.tools_called });
      } else {
        addMessage({ role: "assistant", type: "text", content: data.text ?? "", tools_called: data.tools_called });
      }
    } catch (err) {
      addMessage({
        role: "assistant",
        type: "text",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    } finally {
      setLoading(false);
      setActiveTools([]);
    }
  }, []);

  // ---- Streaming (GET /stream via SSE) ----
  const sendMessageStream = useCallback(async (text: string, source: "user_input" | "a2ui_submit" = "user_input") => {
    if (!text.trim()) return;
    addMessage({ role: "user", type: "text", content: text, source });
    setLoading(true);
    setActiveTools([]);

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
      const res = await fetch(`${API_BASE}/stream?${params}`);
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
            } else if (event.type === "tool_call" && event.tool) {
              setActiveTools((prev) => [...prev, event.tool]);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId
                    ? { ...m, tools_called: [...(m.tools_called || []), event.tool] }
                    : m
                )
              );
            } else if (event.type === "tool_response" && event.tool) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId
                    ? { ...m, tool_outputs: [...(m.tool_outputs || []), event.output || ""] }
                    : m
                )
              );
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
      // Parse A2UI if the final text looks like JSON
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === placeholderId && typeof m.content === "string") {
            try {
              const text = m.content.trim();
              let payload = null;
              const match = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
              if (match) {
                payload = JSON.parse(match[1]);
              } else if (text.startsWith("{")) {
                payload = JSON.parse(text);
              }
              if (payload && Array.isArray(payload.components)) {
                const uiTools = payload.components
                  .filter((c: any) => c.type && c.type !== "text")
                  .map((c: any) => `a2ui_${c.type}`);
                const combinedTools = [...(m.tools_called || []), ...uiTools];
                return { ...m, type: "a2ui", content: payload, tools_called: combinedTools };
              }
            } catch (e) {
              // Ignore parsing errors, leave as text
            }
          }
          return m;
        })
      );
      setLoading(false);
      setActiveTools([]);
    }
  }, []);

  const clearChat = useCallback(async () => {
    setMessages([]);
    sessionIdRef.current = null;
    try {
      await fetch(`${API_BASE}/clear`, { method: "POST" });
    } catch (e) {
      console.error("Failed to clear backend workspace:", e);
    }
  }, []);

  return { messages, loading, activeTools, sendMessage, sendMessageStream, clearChat };
}
