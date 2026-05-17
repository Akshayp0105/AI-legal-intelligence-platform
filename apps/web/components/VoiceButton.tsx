// apps/web/components/VoiceButton.tsx
"use client";

import { useSpeechToText, RecordingState } from "@/hooks/useSpeechToText";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  language?: string;
  disabled?: boolean;
}

export default function VoiceButton({
  onTranscript,
  language = "en-IN",
  disabled = false,
}: VoiceButtonProps) {
  const {
    recordingState,
    interimTranscript,
    isSupported,
    toggleRecording,
    audioLevel,
  } = useSpeechToText({
    language,
    onTranscript,
    onError: (err) => console.warn("Voice error:", err),
  });

  if (!isSupported) return null;

  const isRecording = recordingState === "recording";
  const isError = recordingState === "error";

  // Dynamic bar heights based on audio level
  const bars = [0.4, 0.7, 1.0, 0.7, 0.4, 0.8, 0.5, 0.9, 0.6, 0.4];

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>

      {/* ── Voice overlay card ──────────────────────────── */}
      {isRecording && (
        <>
          <div style={{
            position: "fixed", bottom: "100px",
            left: "50%", transform: "translateX(-50%)",
            zIndex: 100,
            width: "min(420px, 90vw)",
            background: "rgba(8, 16, 32, 0.92)",
            borderRadius: "28px",
            padding: "28px 28px 22px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,160,23,0.2)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "20px",
            animation: "voiceCardIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }}>

            {/* ── Circular breathing ring + mic icon ─────────── */}
            <div style={{ position: "relative", width: "80px", height: "80px",
              display: "flex", alignItems: "center", justifyContent: "center" }}>

              {/* Outer breathing ring — scales with audio level */}
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: `conic-gradient(
                  rgba(239,68,68,${0.15 + audioLevel/200}) 0deg,
                  rgba(212,160,23,${0.1 + audioLevel/300}) 120deg,
                  rgba(239,68,68,${0.15 + audioLevel/200}) 240deg,
                  rgba(239,68,68,${0.15 + audioLevel/200}) 360deg
                )`,
                transform: `scale(${1 + audioLevel / 400})`,
                transition: "transform 0.08s ease, background 0.1s ease",
                animation: "spinSlow 4s linear infinite",
                filter: "blur(2px)",
              }} />

              {/* Middle glow ring */}
              <div style={{
                position: "absolute",
                inset: `${6 - audioLevel/25}px`,
                borderRadius: "50%",
                background: `rgba(239,68,68,${0.12 + audioLevel/300})`,
                transition: "all 0.08s ease",
              }} />

              {/* Inner solid circle */}
              <div style={{
                position: "absolute", inset: "14px", borderRadius: "50%",
                background: "#EF4444",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 ${8 + audioLevel/4}px rgba(239,68,68,0.8)`,
                transition: "box-shadow 0.08s ease",
              }}>
                {/* Stop square */}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                  <rect x="2" y="2" width="10" height="10" rx="2.5"/>
                </svg>
              </div>
            </div>

            {/* ── Waveform bars ───────────────────────────────── */}
            <div style={{
              display: "flex", alignItems: "center", gap: "3px",
              height: "48px", width: "100%", justifyContent: "center",
            }}>
              {Array.from({ length: 28 }, (_, i) => {
                // Create a smooth wave pattern across bars
                const center = 13.5;
                const distFromCenter = Math.abs(i - center) / center;
                const baseScale = 1 - distFromCenter * 0.5;
                const wavePhase = Math.sin(i * 0.4) * 0.3 + 0.7;
                const height = audioLevel > 3
                  ? 6 + (audioLevel / 100) * 36 * baseScale * wavePhase
                  : 4 + Math.sin(i * 0.5 + Date.now() / 400) * 2; // idle gentle wave
                const isActive = audioLevel > 3;
                return (
                  <div key={i} style={{
                    width: "3px",
                    height: `${height}px`,
                    borderRadius: "3px",
                    background: isActive
                      ? i % 3 === 0
                        ? `rgba(212,160,23,${0.6 + audioLevel/200})`
                        : `rgba(239,68,68,${0.5 + audioLevel/250})`
                      : "rgba(255,255,255,0.15)",
                    transition: "height 0.06s ease, background 0.15s ease",
                    flexShrink: 0,
                  }} />
                );
              })}
            </div>

            {/* ── Live transcript ──────────────────────────────── */}
            <div style={{
              minHeight: "28px", width: "100%", textAlign: "center",
              padding: "0 8px",
            }}>
              {interimTranscript ? (
                <p style={{
                  fontSize: "16px", color: "#fff", lineHeight: 1.5,
                  fontFamily: "var(--font-body)", margin: 0,
                  animation: "fadeIn 0.15s ease",
                }}>
                  "{interimTranscript}"
                </p>
              ) : (
                <p style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.35)",
                  fontStyle: "italic", margin: 0,
                }}>
                  {audioLevel > 5 ? "Listening..." : "Start speaking..."}
                </p>
              )}
            </div>

            {/* ── Status + close ───────────────────────────────── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span style={{
                  width: "7px", height: "7px", borderRadius: "50%",
                  background: "#EF4444",
                  animation: "recPulse 1.2s ease-in-out infinite",
                }} />
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                  Recording
                </span>
              </div>

              {/* Language pill */}
              <div style={{
                padding: "3px 10px", borderRadius: "10px",
                background: "rgba(212,160,23,0.12)",
                border: "1px solid rgba(212,160,23,0.25)",
                fontSize: "11px", color: "rgba(212,160,23,0.85)", fontWeight: 500,
              }}>
                {language === "ml-IN" ? "🇮🇳 Malayalam"
                  : language === "hi-IN" ? "🇮🇳 Hindi"
                  : "🇮🇳 English"}
              </div>

              {/* Tap to stop hint */}
              <button
                onClick={toggleRecording}
                style={{
                  fontSize: "12px", color: "rgba(255,255,255,0.35)",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "4px 8px", borderRadius: "6px",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
              >
                Stop ✕
              </button>
            </div>
          </div>

          {/* ── Backdrop ─────────────────────────────────────── */}
          <div
            onClick={toggleRecording}
            style={{
              position: "fixed", inset: 0, zIndex: 99,
              background: "rgba(0,0,0,0.25)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
              animation: "fadeIn 0.25s ease",
            }}
          />

          <style>{`
            @keyframes voiceCardIn {
              from { opacity:0; transform:translateX(-50%) translateY(16px) scale(0.95); }
              to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
            }
            @keyframes spinSlow {
              from { transform: rotate(0deg) scale(${1 + audioLevel / 400}); }
              to   { transform: rotate(360deg) scale(${1 + audioLevel / 400}); }
            }
            @keyframes recPulse {
              0%,100% { opacity:1; transform:scale(1); }
              50%      { opacity:0.3; transform:scale(0.65); }
            }
            @keyframes fadeIn {
              from { opacity:0; } to { opacity:1; }
            }
          `}</style>
        </>
      )}

      {/* The mic button itself */}
      <button
        onClick={toggleRecording}
        disabled={disabled}
        title={isRecording ? "Stop recording" : "Voice input"}
        style={{
          position: "relative", zIndex: 101,
          width: "36px", height: "36px", borderRadius: "10px",
          border: "none", cursor: disabled ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          background: isRecording ? "#EF4444" : isError ? "#FEF2F2" : "transparent",
          transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          transform: isRecording ? "scale(1.1)" : "scale(1)",
          boxShadow: isRecording ? "0 0 0 6px rgba(239,68,68,0.12), 0 0 0 12px rgba(239,68,68,0.05)" : "none",
        }}
        onMouseEnter={e => { if (!isRecording && !disabled) { e.currentTarget.style.background="rgba(10,22,40,0.07)"; e.currentTarget.style.transform="scale(1.08)"; }}}
        onMouseLeave={e => { if (!isRecording) { e.currentTarget.style.background="transparent"; e.currentTarget.style.transform="scale(1)"; }}}
      >
        {isRecording ? (
          <div style={{
            width: "12px", height: "12px", borderRadius: "3px", background: "white",
          }} />
        ) : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke={disabled ? "#CBD5E0" : isError ? "#EF4444" : "#6B7280"}
            strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </button>

      <style>{`
        @keyframes ripple {
          0%   { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes pulse-rec {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
