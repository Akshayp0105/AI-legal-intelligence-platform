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

      {/* Recording overlay — live transcript + waveform */}
      {isRecording && (
        <>
          {/* Backdrop blur pill */}
          <div style={{
            position: "fixed", bottom: "110px",
            left: "50%", transform: "translateX(-50%)",
            zIndex: 100,
            background: "rgba(10, 22, 40, 0.96)",
            borderRadius: "24px",
            padding: "20px 28px",
            minWidth: "340px", maxWidth: "560px",
            boxShadow: "0 20px 60px rgba(10,22,40,0.4)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(212,160,23,0.3)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
            animation: "slideUpFade 0.3s cubic-bezier(0.16,1,0.3,1)",
          }}>
            {/* Waveform bars */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px", height: "40px" }}>
              {bars.map((scale, i) => {
                const height = 8 + (audioLevel / 100) * 28 * scale;
                return (
                  <div key={i} style={{
                    width: "4px",
                    height: `${height}px`,
                    borderRadius: "4px",
                    background: audioLevel > 5
                      ? `rgba(212,160,23,${0.5 + scale * 0.5})`
                      : "rgba(255,255,255,0.2)",
                    transition: "height 0.08s ease, background 0.15s ease",
                    animationDelay: `${i * 0.06}s`,
                  }} />
                );
              })}
            </div>

            {/* Live transcript */}
            <div style={{
              minHeight: "24px", textAlign: "center",
              fontSize: "15px", lineHeight: 1.5,
              color: interimTranscript ? "#fff" : "rgba(255,255,255,0.35)",
              fontStyle: interimTranscript ? "normal" : "italic",
              maxWidth: "480px",
              transition: "color 0.2s",
            }}>
              {interimTranscript || "Listening... speak your legal query"}
            </div>

            {/* Status row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: "#EF4444",
                animation: "pulse-rec 1.2s ease-in-out infinite",
              }} />
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
                Recording • Tap mic to stop
              </span>
            </div>

            {/* Language indicator */}
            <div style={{
              padding: "3px 10px", borderRadius: "10px",
              background: "rgba(212,160,23,0.15)",
              border: "1px solid rgba(212,160,23,0.3)",
              fontSize: "11px", color: "rgba(212,160,23,0.9)", fontWeight: 500,
            }}>
              {language === "ml-IN" ? "🇮🇳 Malayalam" : language === "hi-IN" ? "🇮🇳 Hindi" : "🇮🇳 English (India)"}
            </div>
          </div>

          {/* Dimmed backdrop */}
          <div
            onClick={toggleRecording}
            style={{
              position: "fixed", inset: 0, zIndex: 99,
              background: "rgba(0,0,0,0.15)",
              backdropFilter: "blur(1px)",
              animation: "fadeIn 0.2s ease",
            }}
          />
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
          background: isError
            ? "#FEF2F2"
            : isRecording
            ? "#EF4444"
            : "transparent",
          transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
          transform: isRecording ? "scale(1.08)" : "scale(1)",
        }}
        onMouseEnter={e => {
          if (!isRecording && !disabled)
            e.currentTarget.style.background = "rgba(10,22,40,0.06)";
        }}
        onMouseLeave={e => {
          if (!isRecording)
            e.currentTarget.style.background = "transparent";
        }}
      >
        {/* Ripple ring when recording */}
        {isRecording && (
          <>
            <span style={{
              position: "absolute", inset: "-6px", borderRadius: "16px",
              border: "2px solid rgba(239,68,68,0.4)",
              animation: "ripple 1.5s ease-out infinite",
            }} />
            <span style={{
              position: "absolute", inset: "-12px", borderRadius: "20px",
              border: "1.5px solid rgba(239,68,68,0.2)",
              animation: "ripple 1.5s ease-out 0.4s infinite",
            }} />
          </>
        )}

        {/* Icon: mic or stop */}
        {isRecording ? (
          // Stop square icon
          <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
            <rect x="1" y="1" width="12" height="12" rx="2"/>
          </svg>
        ) : isError ? (
          // Error X icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        ) : (
          // Microphone icon
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke={disabled ? "#CBD5E0" : "#6B7280"}
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
