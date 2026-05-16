"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { useCaseStore } from "../store/useCaseStore";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Welcome to LexAI. How can I assist you with your legal query today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { setAnalysisResult } = useCaseStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, statusText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);
    setStatusText("Analyzing case details...");

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/analysis/analyze/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: currentInput,
          language: "en",
          chat_history: messages.map(m => ({ role: m.role, content: m.content })),
          session_id: "default-session", // In production, use real session ID
          user_role: "public"
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) throw new Error(`Failed to connect to API: ${response.statusText}`);

      reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.chunk) {
                  // Check if it's the full JSON or just a partial chunk
                  // The backend chunks the JSON string, so we accumulate it
                  fullContent += data.chunk;
                  
                  // Try to parse fullContent to see if we have the final object
                  try {
                    const parsed = JSON.parse(fullContent);
                    if (parsed.conversational_reply) {
                      setMessages(prev => prev.map(msg => 
                        msg.id === assistantId ? { ...msg, content: parsed.conversational_reply } : msg
                      ));
                      setAnalysisResult({
                        overview: parsed.overview,
                        laws: parsed.laws,
                        precedents: parsed.precedents,
                        arguments: parsed.arguments,
                        gaps: parsed.gaps || [],
                        strengthScore: parsed.strength_score || 50
                      });
                    }
                  } catch (e) {
                    // Partial JSON, update UI with what we have so far if it's a string
                    // Or just wait for the full JSON
                  }
                }
              } catch (e) {
                console.error("Error parsing SSE data", e);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("LexAI API Error:", error);
      console.error("Error details:", error.message, error.stack);
      
      if (error.name === 'AbortError') {
        setMessages(prev => [...prev, {
          id: assistantId,
          role: 'assistant',
          content: 'The request timed out. The backend may be starting up — please try again.'
        }]);
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantId ? { ...msg, content: "Sorry, I encountered an error connecting to the legal engine. Please check if the API is running." } : msg
        ));
      }
    } finally {
      if (reader) {
        try {
          reader.cancel();
        } catch (e) {
          console.error("Error canceling reader:", e);
        }
      }
      setIsLoading(false);
      setStatusText("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === "user" 
                ? "bg-primary text-primary-foreground rounded-br-sm" 
                : "bg-card border border-border text-card-foreground shadow-sm rounded-bl-sm"
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        
        {isLoading && statusText && (
          <div className="flex justify-start">
            <div className="bg-secondary text-secondary-foreground rounded-full px-4 py-2 text-xs font-medium flex items-center gap-2 border border-border shadow-sm">
              <Loader2 className="w-3 h-3 animate-spin text-accent" />
              {statusText}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2 max-w-4xl mx-auto">
          <button 
            type="button" 
            className="p-3 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-secondary flex-shrink-0"
            title="Attach Document (PDF, Image)"
          >
            <Paperclip size={20} />
          </button>
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the legal situation, paste facts, or ask a question..."
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none h-[52px] max-h-32 overflow-y-auto"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="p-3 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center h-[52px] w-[52px]"
          >
            <Send size={20} className={isLoading ? "opacity-0" : "opacity-100"} />
            {isLoading && <Loader2 size={20} className="absolute animate-spin" />}
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] text-muted-foreground">LexAI can make mistakes. Verify important legal information.</span>
        </div>
      </div>
    </div>
  );
}
