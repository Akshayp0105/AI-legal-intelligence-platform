"use client";
import { useCaseStore } from "../../store/useCaseStore";
import ChatInterface from "../../components/ChatInterface";
import CaseAnalysisCard from "../../components/CaseAnalysisCard";

export default function Dashboard() {
  const { analysisResult } = useCaseStore();

  return (
    <div className="flex h-full w-full">
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${analysisResult ? 'border-r border-border' : ''}`}>
        <ChatInterface />
      </div>
      {analysisResult && (
        <div className="w-[450px] flex-shrink-0 h-full overflow-y-auto bg-muted/10 border-l border-border p-4 shadow-sm">
          <CaseAnalysisCard />
        </div>
      )}
    </div>
  );
}
