// apps/web/hooks/useSpeechToText.ts
"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type RecordingState = "idle" | "recording" | "processing" | "error";

interface UseSpeechToTextOptions {
  language?: string;           // "en-IN" | "ml-IN" | "hi-IN"
  onTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseSpeechToTextReturn {
  recordingState: RecordingState;
  interimTranscript: string;
  isSupported: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  toggleRecording: () => void;
  audioLevel: number;         // 0-100, for animation
}

export function useSpeechToText({
  language = "en-IN",
  onTranscript,
  onFinalTranscript,
  onError,
}: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  // Check browser support on mount
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setIsSupported(supported);
  }, []);

  // Audio level analyser for waveform animation
  const startAudioAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(100, avg * 2.5));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Microphone permission denied — still allow speech recognition
    }
  }, []);

  const stopAudioAnalyser = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      onError?.("Voice input is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    // Stop any existing session first
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition: SpeechRecognition = new SpeechRec();
    recognitionRef.current = recognition;

    recognition.lang = language;
    recognition.continuous = true;        // Keep recording until stopped manually
    recognition.interimResults = true;    // Show live partial results
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setRecordingState("recording");
      setInterimTranscript("");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        onTranscript?.(final);
        setInterimTranscript("");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const messages: Record<string, string> = {
        "not-allowed": "Microphone permission denied. Please allow microphone access.",
        "no-speech": "No speech detected. Please try again.",
        "network": "Network error. Check your connection.",
        "aborted": "",  // Silent — user cancelled
      };
      const msg = messages[event.error] ?? `Voice error: ${event.error}`;
      if (msg) {
        setRecordingState("error");
        onError?.(msg);
        setTimeout(() => setRecordingState("idle"), 2500);
      }
      stopAudioAnalyser();
    };

    recognition.onend = () => {
      stopAudioAnalyser();
      setInterimTranscript("");
      setRecordingState("idle");
    };

    try {
      recognition.start();
      await startAudioAnalyser();
    } catch (e) {
      onError?.("Could not start microphone. Please try again.");
      setRecordingState("idle");
    }
  }, [isSupported, language, onTranscript, onError, startAudioAnalyser, stopAudioAnalyser]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    stopAudioAnalyser();
    setRecordingState("idle");
    setInterimTranscript("");
  }, [stopAudioAnalyser]);

  const toggleRecording = useCallback(() => {
    if (recordingState === "recording") {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    recordingState,
    interimTranscript,
    isSupported,
    startRecording,
    stopRecording,
    toggleRecording,
    audioLevel,
  };
}
