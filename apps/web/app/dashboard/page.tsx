"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCaseStore } from "../../store/useCaseStore";
import ChatInterface from "../../components/ChatInterface";
import CaseAnalysisCard from "../../components/CaseAnalysisCard";
import { getSessionId } from "../../../../packages/shared/index";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiInfo {
  name?: string;
  version?: string;
  [key: string]: unknown;
}

interface RestoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  analysis?: AnalysisResult;
  domain?: string;
  timestamp: Date;
}

function getApiInfo(): Promise<ApiInfo | null> {
  return fetch(`${API}/api/info`).then(r => r.json()).catch(() => null);
}

function DashboardContent() {
  const { analysisResult, setAnalysisResult } = useCaseStore();
  const searchParams = useSearchParams();
  const caseId = searchParams.get("case_id");
  const [initialMessages, setInitialMessages] = useState<RestoredMessage[]>([]);

  useEffect(() => {
    if (!caseId) return;
    const sid = getSessionId();
    // Fetch the case's message history and pre-populate chat
    fetch(`${API}/api/v1/cases/${caseId}/messages?session_id=${sid}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages) {
          const restored = data.messages.map((m: { id: string; role: string; content: string; analysis?: AnalysisResult; domain?: string; created_at: string }) => ({
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
