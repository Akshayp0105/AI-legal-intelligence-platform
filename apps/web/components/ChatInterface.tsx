"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import VoiceButton from "@/components/VoiceButton";

// ChatInterface v1.0.1 - Enhanced UI
// ─── Types ────────────────────────────────────────────────────────────────────

/** Legal act/section reference returned by the analysis API. */

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
  initialMessages?: Message[];
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
  corporate: "#1D4ED8",
  property: "#B45309",
  family: "#BE185D",
  consumer: "#047857",
  labour: "#0369A1",
  constitutional: "#4F46E5",
  general: "#6B7280",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatInterface({
  onAnalysisComplete,
  uploadedDocIds = [],
  initialMessages = [],
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);
  const [statusText, setStatusText] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [detectedDomain, setDetectedDomain] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("en-IN");

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--off-white)", fontFamily: "var(--font-body)" }}>

      {/* Header bar */}
      <div style={{ padding: "16px 28px", borderBottom: "1px solid var(--border)", background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 0 var(--border)" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 500, color: "var(--navy)", letterSpacing: "-0.3px" }}>New Case</h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "1px" }}>AI-powered legal analysis • Indian Law</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {detectedDomain && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "20px", background: "var(--amber-pale)", border: "1px solid rgba(212,160,23,0.3)", animation: "badge-pop 0.35s var(--ease-spring)" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--amber)", animation: "pulse-dot 2s ease-in-out infinite", display: "inline-block" }} />
              <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--navy)" }}>{detectedDomain} Law</span>
            </div>
          )}
          {/* Language selector for voice input */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {[
              { code: "en-IN", label: "EN" },
              { code: "ml-IN", label: "ML" },
              { code: "hi-IN", label: "HI" },
            ].map(lang => (
              <button
                key={lang.code}
                onClick={() => setVoiceLanguage(lang.code)}
                title={`Voice input in ${lang.code === "en-IN" ? "English" : lang.code === "ml-IN" ? "Malayalam" : "Hindi"}`}
                style={{
                  padding: "4px 9px", borderRadius: "8px", fontSize: "11px",
                  fontWeight: voiceLanguage === lang.code ? 600 : 400,
                  border: voiceLanguage === lang.code
                    ? "1px solid var(--navy)" : "1px solid var(--border)",
                  background: voiceLanguage === lang.code ? "var(--navy)" : "transparent",
                  color: voiceLanguage === lang.code ? "#fff" : "var(--text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >{lang.label}</button>
            ))}
            <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "2px" }}>
              🎙️
            </span>
          </div>
        </div>
      </div>

      {/* Message area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 28px", display: "flex", flexDirection: "column", gap: "28px" }}>

        {/* Welcome state */}
        {messages.length === 0 && !isLoading && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", flex: 1, gap: "0px",
            paddingBottom: "40px", position: "relative", overflow: "hidden",
          }}>

            {/* ── Ambient background elements ─────────────────────── */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
              {/* Large soft gradient orb top-right */}
              <div style={{
                position: "absolute", top: "-80px", right: "-60px",
                width: "400px", height: "400px", borderRadius: "50%",
                background: "radial-gradient(circle, rgba(212,160,23,0.06) 0%, transparent 70%)",
                animation: "floatOrb 8s ease-in-out infinite",
              }} />
              {/* Smaller orb bottom-left */}
              <div style={{
                position: "absolute", bottom: "40px", left: "-40px",
                width: "280px", height: "280px", borderRadius: "50%",
                background: "radial-gradient(circle, rgba(10,22,40,0.04) 0%, transparent 70%)",
                animation: "floatOrb 10s ease-in-out 2s infinite reverse",
              }} />
              {/* Subtle grid pattern */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: "radial-gradient(circle, rgba(10,22,40,0.04) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
                maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 100%)",
              }} />
              {/* Floating legal symbols */}
              {[
                { symbol: "§", top: "15%", left: "8%",  size: 28, delay: "0s",   dur: "7s"  },
                { symbol: "⚖", top: "20%", right: "10%", size: 24, delay: "1s",   dur: "9s"  },
                { symbol: "📜", top: "70%", left: "6%",  size: 20, delay: "2s",   dur: "8s"  },
                { symbol: "🏛", top: "65%", right: "8%", size: 22, delay: "0.5s", dur: "11s" },
                { symbol: "§", top: "45%", left: "3%",  size: 18, delay: "3s",   dur: "6s"  },
                { symbol: "⚖", top: "80%", right: "5%", size: 16, delay: "1.5s", dur: "10s" },
              ].map((item, i) => (
                <div key={i} style={{
                  position: "absolute",
                  top: item.top, left: item.left, right: item.right,
                  fontSize: `${item.size}px`,
                  opacity: 0.07,
                  animation: `floatSymbol ${item.dur} ease-in-out ${item.delay} infinite`,
                  userSelect: "none",
                }}>{item.symbol}</div>
              ))}
            </div>

            {/* ── Logo mark ────────────────────────────────────────── */}
            <div style={{
              width: "72px", height: "72px", borderRadius: "22px",
              background: "var(--navy)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 32px rgba(10,22,40,0.18), 0 0 0 1px rgba(212,160,23,0.15)",
              marginBottom: "28px", position: "relative",
              animation: "logoEntrance 0.8s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              {/* Amber ring pulse */}
              <div style={{
                position: "absolute", inset: "-3px", borderRadius: "25px",
                border: "1.5px solid rgba(212,160,23,0.25)",
                animation: "ringPulse 3s ease-in-out infinite",
              }} />
              <span style={{
                fontFamily: "var(--font-display)", fontSize: "28px",
                fontWeight: 600, color: "var(--amber)", lineHeight: 1,
              }}>L</span>
            </div>

            {/* ── Typewriter headline ───────────────────────────────── */}
            <TypewriterHeadline />

            {/* ── Subtitle ─────────────────────────────────────────── */}
            <p style={{
              fontSize: "15px", color: "var(--text-muted)", textAlign: "center",
              maxWidth: "360px", lineHeight: 1.65, marginTop: "12px", marginBottom: "36px",
              animation: "fadeUp 0.7s 0.3s var(--ease-out) both",
            }}>
              Describe your legal situation, paste case facts, or ask about any area of Indian law.
            </p>

            {/* ── Suggestion chips ─────────────────────────────────── */}
            <div style={{
              display: "flex", gap: "8px", flexWrap: "wrap",
              justifyContent: "center", maxWidth: "520px",
            }}>
              {[
                { label: "Register a startup in Kerala",      icon: "🏢", domain: "corporate" },
                { label: "Cyber bullying complaint process",  icon: "🛡️", domain: "cyber"     },
                { label: "Property dispute with neighbour",   icon: "🏠", domain: "property"  },
                { label: "Consumer complaint against Amazon", icon: "📦", domain: "consumer"  },
                { label: "Divorce maintenance rights",        icon: "⚖️", domain: "family"    },
                { label: "Wrongful termination of job",       icon: "💼", domain: "labour"    },
              ].map((chip, i) => (
                <SuggestionChip
                  key={chip.label}
                  chip={chip}
                  index={i}
                  onClick={() => setInput(chip.label)}
                />
              ))}
            </div>

            {/* ── Trust bar ─────────────────────────────────────────── */}
            <div style={{
              display: "flex", alignItems: "center", gap: "20px",
              marginTop: "40px", paddingTop: "28px",
              borderTop: "1px solid var(--border)",
              animation: "fadeUp 0.6s 0.8s var(--ease-out) both",
            }}>
              {[
                { value: "IPC + CrPC", label: "Criminal Law" },
                { value: "Companies Act", label: "Corporate Law" },
                { value: "RERA + TP Act", label: "Property Law" },
                { value: "8+ Domains", label: "Areas of Law" },
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--navy)", marginBottom: "2px" }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <style>{`
              @keyframes floatOrb {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33%       { transform: translate(12px, -16px) scale(1.05); }
                66%       { transform: translate(-8px, 10px) scale(0.97); }
              }
              @keyframes floatSymbol {
                0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.07; }
                50%       { transform: translateY(-14px) rotate(6deg); opacity: 0.12; }
              }
              @keyframes logoEntrance {
                from { opacity: 0; transform: scale(0.7) translateY(10px); }
                to   { opacity: 1; transform: scale(1) translateY(0); }
              }
              @keyframes ringPulse {
                0%, 100% { opacity: 0.5; transform: scale(1); }
                50%       { opacity: 1; transform: scale(1.04); }
              }
              @keyframes fadeUp {
                from { opacity: 0; transform: translateY(10px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: "10px", animation: "fadeUp 0.4s var(--ease-out) both", animationDelay: `${idx * 30}ms` }}>

            {msg.role === "user" && (
              <div style={{ maxWidth: "72%", padding: "14px 18px", borderRadius: "20px 20px 4px 20px", background: "var(--navy)", color: "#fff", fontSize: "14px", lineHeight: 1.65, boxShadow: "var(--shadow-md)", whiteSpace: "pre-wrap" }}>{msg.content}</div>
            )}

            {msg.role === "assistant" && (
              <div style={{ maxWidth: "88%", display: "flex", flexDirection: "column", gap: "12px" }}>
                {msg.domain && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 11px", borderRadius: "20px", alignSelf: "flex-start", background: "var(--amber-pale)", border: "1px solid rgba(212,160,23,0.25)", animation: "badge-pop 0.35s var(--ease-spring)" }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--amber)", display: "inline-block" }} />
                    <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "var(--navy)" }}>{msg.domain} Law</span>
                  </div>
                )}
                <div style={{ padding: "16px 20px", borderRadius: "4px 20px 20px 20px", background: "var(--white)", border: "1px solid var(--border)", fontSize: "14px", lineHeight: 1.7, color: "var(--text-primary)", boxShadow: "var(--shadow-sm)", whiteSpace: "pre-wrap" }}>{msg.content}</div>

                {msg.analysis?.applicable_laws && msg.analysis.applicable_laws.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" as const, paddingLeft: "2px" }}>Applicable Laws</p>
                    {msg.analysis.applicable_laws.map((law, i) => (
                      <div key={i} style={{ background: "var(--white)", border: "1px solid var(--border)", borderLeft: "3px solid var(--amber)", borderRadius: "0 12px 12px 0", padding: "12px 16px", boxShadow: "var(--shadow-sm)", animation: `slideIn 0.35s var(--ease-out) ${i * 60}ms both` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "6px", background: "var(--navy)", color: "var(--amber)", letterSpacing: "0.02em" }}>{law.act}{law.section ? ` §${law.section}` : ""}</span>
                          <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{law.title}</span>
                          {law.relevance === "high" && <span style={{ marginLeft: "auto", fontSize: "10px", padding: "2px 7px", borderRadius: "10px", background: "#ECFDF5", color: "#047857", fontWeight: 500 }}>High relevance</span>}
                        </div>
                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>{law.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}

                {msg.analysis?.practical_steps && msg.analysis.practical_steps.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" as const, paddingLeft: "2px" }}>Action Steps</p>
                    {msg.analysis.practical_steps.map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: "12px", padding: "12px 16px", background: "var(--white)", border: "1px solid var(--border)", borderRadius: "12px", boxShadow: "var(--shadow-sm)", animation: `slideIn 0.35s var(--ease-out) ${i * 60 + 100}ms both` }}>
                        <div style={{ minWidth: "26px", height: "26px", borderRadius: "8px", background: "var(--amber-pale)", border: "1px solid rgba(212,160,23,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "var(--amber)" }}>{step.step}</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "3px" }}>{step.action}</p>
                          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>📍 {step.where}{step.cost && step.cost !== "Varies" ? <span style={{ marginLeft: "12px" }}>💰 {step.cost}</span> : null}</p>
                          {step.documents?.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "4px", marginTop: "6px" }}>
                              {step.documents.map((doc, di) => <span key={di} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>{doc}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {msg.analysis?.needs_advocate && msg.analysis?.advocate_urgency === "immediate" && (
                  <div style={{ padding: "12px 16px", borderRadius: "12px", background: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", gap: "10px", animation: "scaleIn 0.3s var(--ease-spring)" }}>
                    <span style={{ fontSize: "18px" }}>⚠️</span>
                    <p style={{ fontSize: "13px", color: "#DC2626", margin: 0, lineHeight: 1.5 }}>This matter requires <strong>immediate legal representation</strong>. Contact a qualified advocate as soon as possible.</p>
                  </div>
                )}

                {msg.analysis && (
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", paddingLeft: "2px", lineHeight: 1.5 }}>ℹ️ {msg.analysis.disclaimer}</p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading state */}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px", animation: "fadeUp 0.3s var(--ease-out)" }}>
            {statusText && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", background: "var(--amber-pale)", border: "1px solid rgba(212,160,23,0.4)" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--amber)", animation: "pulse-dot 1s ease-in-out infinite", display: "inline-block" }} />
                <span style={{ fontSize: "11px", color: "var(--navy)", fontWeight: 500 }}>{statusText}</span>
              </div>
            )}
            <div style={{ maxWidth: "80%", padding: "16px 20px", borderRadius: "4px 20px 20px 20px", background: "var(--white)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", fontSize: "14px", lineHeight: 1.7, color: "var(--text-primary)", minWidth: "60px" }}>
              {streamingText ? (
                <>
                  {streamingText}
                  <span style={{ display: "inline-block", width: "2px", height: "15px", background: "var(--navy)", marginLeft: "2px", verticalAlign: "text-bottom", animation: "cursor-blink 0.9s step-end infinite" }} />
                </>
              ) : (
                <div style={{ display: "flex", gap: "5px", alignItems: "center", height: "18px" }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--navy)", opacity: 0.3, animation: `bounce-dot 1.1s ease-in-out ${i * 180}ms infinite`, display: "inline-block" }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: "16px 28px 20px", background: "var(--white)", borderTop: "1px solid var(--border)" }}>
        <div
          style={{ display: "flex", gap: "10px", alignItems: "flex-end", background: "var(--off-white)", border: "1.5px solid var(--border-strong)", borderRadius: "16px", padding: "10px 10px 10px 16px", transition: "border-color var(--duration-fast)", boxShadow: "var(--shadow-sm)" }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = "var(--navy)")}
          onBlurCapture={e => (e.currentTarget.style.borderColor = "var(--border-strong)")}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the legal situation, paste facts, or ask a question..."
            disabled={isLoading}
            rows={1}
            style={{ flex: 1, resize: "none", border: "none", outline: "none", background: "transparent", fontSize: "14px", lineHeight: 1.6, fontFamily: "var(--font-body)", color: "var(--text-primary)", minHeight: "36px", maxHeight: "120px", overflowY: "auto", padding: "6px 0" }}
            onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }}
          />
          <VoiceButton
            language={voiceLanguage}
            disabled={isLoading}
            onTranscript={(text) => {
              // Append to existing input (supports mid-sentence additions)
              setInput(prev => {
                const trimmed = prev.trimEnd();
                return trimmed ? trimmed + " " + text.trim() : text.trim();
              });
              // Auto-resize textarea after voice input
              if (inputRef.current) {
                inputRef.current.style.height = "auto";
                inputRef.current.style.height =
                  Math.min(inputRef.current.scrollHeight, 120) + "px";
                inputRef.current.focus();
              }
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            style={{ width: "36px", height: "36px", borderRadius: "10px", border: "none", cursor: !input.trim() || isLoading ? "not-allowed" : "pointer", background: !input.trim() || isLoading ? "var(--surface)" : "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all var(--duration-base) var(--ease-out)", boxShadow: !input.trim() || isLoading ? "none" : "var(--shadow-md)" }}
            onMouseEnter={e => { if (input.trim() && !isLoading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = input.trim() && !isLoading ? "var(--shadow-md)" : "none"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={!input.trim() || isLoading ? "var(--text-muted)" : "var(--amber)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "10px", lineHeight: 1.4 }}>
          LexAI can make mistakes. Verify important legal information with a qualified advocate.
        </p>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes badge-pop { 0%{transform:scale(0.8);opacity:0;} 60%{transform:scale(1.06);} 100%{transform:scale(1);opacity:1;} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.4;transform:scale(0.75);} }
        @keyframes bounce-dot { 0%,60%,100%{transform:translateY(0);} 30%{transform:translateY(-5px);} }
        @keyframes cursor-blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
      `}</style>
    </div>
  );
}

// ── TypewriterHeadline ─────────────────────────────────────────────────────

const HEADLINES = [
  "How can I assist you today?",
  "Understand your rights under Indian law.",
  "Analyze your case with AI precision.",
  "Draft legal documents in seconds.",
  "Find relevant precedents instantly.",
];

function TypewriterHeadline() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "waiting" | "erasing">("typing");
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const current = HEADLINES[phraseIndex];

    if (phase === "typing") {
      if (charIndex < current.length) {
        const t = setTimeout(() => {
          setDisplayed(current.slice(0, charIndex + 1));
          setCharIndex(i => i + 1);
        }, 38 + Math.random() * 20); // Slightly variable speed = natural feel
        return () => clearTimeout(t);
      } else {
        // Fully typed — wait 2.4s before erasing
        const t = setTimeout(() => setPhase("erasing"), 2400);
        return () => clearTimeout(t);
      }
    }

    if (phase === "erasing") {
      if (charIndex > 0) {
        const t = setTimeout(() => {
          setDisplayed(current.slice(0, charIndex - 1));
          setCharIndex(i => i - 1);
        }, 18); // Erase faster than type
        return () => clearTimeout(t);
      } else {
        // Fully erased — move to next phrase
        setPhraseIndex(i => (i + 1) % HEADLINES.length);
        setPhase("typing");
      }
    }
  }, [phase, charIndex, phraseIndex]);

  return (
    <h2 style={{
      fontFamily: "var(--font-display)", fontSize: "clamp(22px, 3vw, 32px)",
      fontWeight: 500, color: "var(--navy)", textAlign: "center",
      letterSpacing: "-0.5px", lineHeight: 1.2,
      minHeight: "44px", display: "flex", alignItems: "center", gap: "2px",
      animation: "fadeUp 0.6s 0.1s var(--ease-out) both",
    }}>
      {displayed}
      {/* Blinking cursor */}
      <span style={{
        display: "inline-block", width: "2px", height: "1em",
        background: "var(--amber)", marginLeft: "1px",
        borderRadius: "2px",
        animation: "cursorBlink 0.85s step-end infinite",
      }} />
      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </h2>
  );
}

// ── SuggestionChip ─────────────────────────────────────────────────────────



function SuggestionChip({
  chip, index, onClick,
}: {
  chip: { label: string; icon: string; domain: string };
  index: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = DOMAIN_COLORS[chip.domain] || "#6B7280";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "9px 16px", borderRadius: "24px", fontSize: "13px",
        border: hovered ? `1.5px solid ${color}` : "1.5px solid var(--border-strong)",
        background: hovered ? `${color}0D` : "var(--white)",
        color: hovered ? color : "var(--text-secondary)",
        cursor: "pointer", fontFamily: "var(--font-body)",
        display: "flex", alignItems: "center", gap: "7px",
        transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? `0 4px 14px ${color}20` : "var(--shadow-sm)",
        animation: `fadeUp 0.5s ${0.4 + index * 0.07}s var(--ease-out) both`,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: "14px" }}>{chip.icon}</span>
      {chip.label}
    </button>
  );
}
