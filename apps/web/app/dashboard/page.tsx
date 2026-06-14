"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCaseStore } from "../../store/useCaseStore";
import ChatInterface from "../../components/ChatInterface";
import CaseAnalysisCard from "../../components/CaseAnalysisCard";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("lexai_session");
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("lexai_session", id); }
  return id;
}

function getApiInfo(): Promise<any> {
  return fetch(`${API}/api/info`).then(r => r.json()).catch(() => null);
}

function DashboardContent() {
  const { analysisResult, setAnalysisResult } = useCaseStore();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("case_id");
  const [initialMessages, setInitialMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!caseId) return;
    const sid = getSessionId();
    // Fetch the case's message history and pre-populate chat
    fetch(`${API}/api/v1/cases/${caseId}/messages?session_id=${sid}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages) {
          const restored = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            analysis: m.analysis,
            domain: m.domain,
            timestamp: new Date(m.created_at),
          }));
          setInitialMessages(restored);
          // Restore the last analysis result to the right panel
          const lastAnalysis = [...restored].reverse().find(m => m.analysis);
          if (lastAnalysis?.analysis) {
             setAnalysisResult(lastAnalysis.analysis);
          }
        }
      })
      .catch(console.error);
  }, [caseId, setAnalysisResult]);

  return (
    <div className="flex h-full w-full">
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${analysisResult ? 'border-r border-border' : ''}`}>
        <ChatInterface 
          initialMessages={initialMessages}
          onAnalysisComplete={(result) => setAnalysisResult(result)} 
        />
      </div>
      {analysisResult && (
        <div className="w-[450px] flex-shrink-0 h-full overflow-y-auto bg-muted/10 border-l border-border p-4 shadow-sm">
          <CaseAnalysisCard />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
