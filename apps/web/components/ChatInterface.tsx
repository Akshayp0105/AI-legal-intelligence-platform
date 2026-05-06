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
    setInput("");
    setIsLoading(true);
    setStatusText("Analyzing case details...");

    // Simulate SSE / streaming response
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      // Mocking the SSE process
      const statuses = [
        "Identifying legal issues...",
        "Searching precedents (Qdrant)...",
        "Analyzing under: IPC §302, CrPC §154...",
        "Drafting arguments..."
      ];
      
      for (let i = 0; i < statuses.length; i++) {
        setStatusText(statuses[i]);
        await new Promise(r => setTimeout(r, 800));
      }

      const mockResponse = "Based on the details provided, the primary legal issues involve Section 302 of the IPC regarding murder, and procedural aspects under Section 154 of the CrPC. I have analyzed the precedents and generated a case strength overview. Please check the analysis panel on the right for a detailed breakdown.";
      
      setStatusText("");
      
      // Simulate typing animation
      for (let i = 0; i < mockResponse.length; i++) {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantId ? { ...msg, content: mockResponse.substring(0, i + 1) } : msg
        ));
        await new Promise(r => setTimeout(r, 15));
      }

      // Set global state to trigger the Case Analysis Panel
      setAnalysisResult({
        overview: "This case has a moderate to strong standing based on available evidence and recent Supreme Court rulings regarding circumstantial evidence under Section 302 IPC.",
        laws: [
          { section: "IPC §302", description: "Punishment for murder." },
          { section: "CrPC §154", description: "Information in cognizable cases (FIR)." }
        ],
        precedents: [
          { name: "State of Maharashtra v. Suresh", relevance: "Highly relevant regarding circumstantial evidence chain.", url: "#" },
          { name: "Sharad Birdhichand Sarda v. State of Maharashtra", relevance: "Landmark judgment on the panchsheel of circumstantial evidence.", url: "#" }
        ],
        arguments: {
          plaintiff: ["Clear chain of circumstantial evidence.", "Motive established by previous enmity."],
          defendant: ["Missing link in the chain of evidence.", "Delayed FIR without reasonable explanation."]
        },
        gaps: ["Need witness statements to corroborate the timeline.", "Forensic report pending."],
        strengthScore: 65
      });

    } catch (error) {
      console.error(error);
    } finally {
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
