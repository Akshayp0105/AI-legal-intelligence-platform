"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LawSection {
  act: string;
  section: string;
  title: string;
  explanation: string;
  relevance: string;
}

interface PracticalStep {
  step: number;
  action: string;
  where: string;
  documents: string[];
  cost: string;
}

interface AnalysisResult {
  conversational_reply: string;
  domain: string;
  applicable_laws: LawSection[];
  practical_steps: PracticalStep[];
  key_rights?: string[];
  documents_needed: string[];
  limitation_period?: string;
  jurisdiction?: string;
  needs_advocate: boolean;
  advocate_urgency: string;
  draft_suggestions: string[];
  disclaimer: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  analysis?: AnalysisResult;
  domain?: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onAnalysisComplete?: (result: AnalysisResult) => void;
  uploadedDocIds?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem("lexai_session");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("lexai_session", id);
  }
  return id;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "http://localhost:8000");

const DOMAIN_COLORS: Record<string, string> = {
  cyber: "#7C3AED",
  criminal: "#DC2626",
  corporate: "#2563EB",
  property: "#D97706",
  family: "#DB2777",
  consumer: "#059669",
  labour: "#0891B2",
  constitutional: "#4F46E5",
  general: "#6B7280",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatInterface({
  onAnalysisComplete,
  uploadedDocIds = [],
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [detectedDomain, setDetectedDomain] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setStreamingText("");
    setStatusText("Identifying legal domain...");
    setDetectedDomain("");

    // Build history from current messages
    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Cancel any previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // 30 second timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000);

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/analysis/analyze/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            message: text,
            session_id: getSessionId(),
            chat_history: history,
            language: "en",
            user_role: "public",
          }),
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server error ${response.status}: ${await response.text()}`);
      }

      if (!response.body) {
        throw new Error("No response body from server");
      }

      // ── Read the SSE stream ──────────────────────────────────────────────
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let accumulatedText = "";
      let finalResult: AnalysisResult | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from buffer
          const lines = buffer.split("\n");
          // Keep last incomplete line in buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const dataStr = trimmed.slice(6).trim();
            if (dataStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(dataStr);

              if (parsed.type === "domain") {
                setDetectedDomain(parsed.domain ?? "");
                setStatusText(
                  `Analyzing ${parsed.domain ?? "legal"} law...`
                );
              } else if (parsed.type === "chunk") {
                accumulatedText += parsed.text ?? "";
                setStreamingText(accumulatedText);
              } else if (parsed.type === "complete") {
                finalResult = parsed.data as AnalysisResult;
              } else if (parsed.type === "error") {
                throw new Error(parsed.message ?? "Unknown stream error");
              }
            } catch (parseErr) {
              // Skip malformed SSE lines silently
              console.warn("SSE parse skip:", trimmed.slice(0, 80));
            }
          }
        }
      } finally {
        reader.cancel().catch(() => {});
      }

      // ── Build assistant message from result ──────────────────────────────
      const reply =
        finalResult?.conversational_reply ||
        accumulatedText ||
        "I have analyzed your query. Please see the details below.";

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        analysis: finalResult ?? undefined,
        domain: finalResult?.domain ?? detectedDomain,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (finalResult && onAnalysisComplete) {
        onAnalysisComplete(finalResult);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("LexAI Chat Error:", err);

      const isAbort = err.name === "AbortError";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: isAbort
            ? "The request timed out. Please try again — the server may be starting up."
            : `Error: ${err.message}. Make sure the backend is running at ${API_BASE}.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingText("");
      setStatusText("");
    }
  }, [input, isLoading, messages, onAnalysisComplete, detectedDomain]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Welcome */}
        {messages.length === 0 && !isLoading && (
          <div style={{ alignSelf: "flex-start", maxWidth: "75%", background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "16px", padding: "14px 18px", fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
            Welcome to LexAI. How can I assist you with your legal query today?
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: "8px" }}>

            {/* Domain badge on assistant messages */}
            {msg.role === "assistant" && msg.domain && (
              <span style={{
                fontSize: "10px", padding: "2px 8px", borderRadius: "20px",
                background: `${DOMAIN_COLORS[msg.domain] ?? "#6B7280"}18`,
                color: DOMAIN_COLORS[msg.domain] ?? "#6B7280",
                border: `0.5px solid ${DOMAIN_COLORS[msg.domain] ?? "#6B7280"}40`,
                fontWeight: 500, alignSelf: "flex-start", marginLeft: "4px"
              }}>
                {msg.domain.toUpperCase()} LAW
              </span>
            )}

            {/* Bubble */}
            <div style={{
              maxWidth: "78%",
              padding: "12px 16px",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "user" ? "#0A1628" : "#fff",
              color: msg.role === "user" ? "#fff" : "#111827",
              border: msg.role === "user" ? "none" : "0.5px solid #e5e7eb",
              fontSize: "14px",
              lineHeight: 1.65,
              whiteSpace: "pre-wrap",
            }}>
              {msg.content}
            </div>

            {/* Law sections */}
            {msg.role === "assistant" && msg.analysis?.applicable_laws && msg.analysis.applicable_laws.length > 0 && (
              <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: "6px", marginLeft: "4px" }}>
                <span style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500 }}>APPLICABLE LAWS</span>
                {msg.analysis.applicable_laws.map((law, i) => (
                  <div key={i} style={{
                    background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "10px",
                    padding: "10px 14px", fontSize: "13px"
                  }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{
                        fontSize: "11px", fontWeight: 600, padding: "2px 8px",
                        borderRadius: "8px", background: "#0A1628", color: "#fff"
                      }}>
                        {law.act}{law.section ? ` §${law.section}` : ""}
                      </span>
                      <span style={{ fontWeight: 500, color: "#111827", fontSize: "13px" }}>{law.title}</span>
                    </div>
                    <p style={{ margin: 0, color: "#6B7280", fontSize: "12px", lineHeight: 1.5 }}>{law.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Practical steps */}
            {msg.role === "assistant" && msg.analysis?.practical_steps && msg.analysis.practical_steps.length > 0 && (
              <div style={{ maxWidth: "78%", marginLeft: "4px" }}>
                <span style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 500 }}>PRACTICAL STEPS</span>
                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {msg.analysis.practical_steps.map((step, i) => (
                    <div key={i} style={{
                      background: "#F9FAFB", border: "0.5px solid #e5e7eb", borderRadius: "10px",
                      padding: "10px 14px", fontSize: "13px", display: "flex", gap: "12px"
                    }}>
                      <span style={{
                        minWidth: "22px", height: "22px", borderRadius: "50%",
                        background: "#0A1628", color: "#fff", display: "flex",
                        alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 600
                      }}>{step.step}</span>
                      <div>
                        <div style={{ fontWeight: 500, color: "#111827" }}>{step.action}</div>
                        <div style={{ color: "#6B7280", fontSize: "12px" }}>{step.where}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advocate warning */}
            {msg.role === "assistant" && msg.analysis?.needs_advocate && msg.analysis?.advocate_urgency === "immediate" && (
              <div style={{
                maxWidth: "78%", marginLeft: "4px", background: "#FEF2F2",
                border: "0.5px solid #FECACA", borderRadius: "10px",
                padding: "10px 14px", fontSize: "12px", color: "#DC2626"
              }}>
                ⚠️ This situation requires immediate consultation with an advocate.
              </div>
            )}

            {/* Disclaimer */}
            {msg.role === "assistant" && msg.analysis && (
              <p style={{ maxWidth: "78%", marginLeft: "4px", fontSize: "11px", color: "#9CA3AF", margin: "2px 0 0 4px" }}>
                {msg.analysis.disclaimer}
              </p>
            )}
          </div>
        ))}

        {/* Streaming bubble */}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
            {statusText && (
              <span style={{
                fontSize: "10px", padding: "2px 10px", borderRadius: "20px",
                background: "#EEF2FF", color: "#4F46E5", border: "0.5px solid #C7D2FE",
                fontWeight: 500
              }}>{statusText}</span>
            )}
            <div style={{
              maxWidth: "78%", padding: "12px 16px",
              borderRadius: "18px 18px 18px 4px",
              background: "#fff", border: "0.5px solid #e5e7eb",
              fontSize: "14px", lineHeight: 1.65, color: "#111827"
            }}>
              {streamingText ? (
                <span>{streamingText}<span style={{ display: "inline-block", width: "2px", height: "14px", background: "#4F46E5", marginLeft: "2px", animation: "blink 1s step-end infinite", verticalAlign: "text-bottom" }} /></span>
              ) : (
                <span style={{ display: "flex", gap: "4px", alignItems: "center", padding: "2px 0" }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: "7px", height: "7px", borderRadius: "50%", background: "#D1D5DB",
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
                    }} />
                  ))}
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        borderTop: "0.5px solid #e5e7eb", padding: "16px 20px",
        background: "#fff", display: "flex", gap: "10px", alignItems: "flex-end"
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the legal situation, paste facts, or ask a question..."
          disabled={isLoading}
          rows={1}
          style={{
            flex: 1, resize: "none", border: "0.5px solid #D1D5DB",
            borderRadius: "12px", padding: "10px 14px", fontSize: "14px",
            fontFamily: "inherit", outline: "none", lineHeight: 1.5,
            minHeight: "42px", maxHeight: "120px", overflowY: "auto",
            background: isLoading ? "#F9FAFB" : "#fff",
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            width: "42px", height: "42px", borderRadius: "12px",
            background: !input.trim() || isLoading ? "#D1D5DB" : "#D4A017",
            border: "none", cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s", flexShrink: 0
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      <p style={{ textAlign: "center", fontSize: "11px", color: "#9CA3AF", padding: "0 0 10px", margin: 0 }}>
        LexAI can make mistakes. Verify important legal information.
      </p>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
