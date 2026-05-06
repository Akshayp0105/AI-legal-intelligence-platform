"use client";

import { useState } from "react";
import { useCaseStore } from "../store/useCaseStore";
import { Scale, BookOpen, AlertCircle, TrendingUp, ChevronDown, ChevronUp, Swords } from "lucide-react";

export default function CaseAnalysisCard() {
  const { analysisResult } = useCaseStore();
  const [activeTab, setActiveTab] = useState<"overview" | "laws" | "precedents" | "arguments">("overview");
  const [expandedPrecedent, setExpandedPrecedent] = useState<number | null>(null);

  if (!analysisResult) return null;

  const score = analysisResult.strengthScore;
  const scoreColor = score < 40 ? "text-red-500" : score <= 70 ? "text-yellow-500" : "text-green-500";
  const strokeColor = score < 40 ? "#ef4444" : score <= 70 ? "#eab308" : "#22c55e";

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header & Gauge */}
      <div className="p-5 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Scale className="text-accent w-5 h-5" />
            Case Analysis
          </h2>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="transition-all duration-1000 ease-out"
                strokeWidth="3"
                strokeDasharray={`${score}, 100`}
                stroke={strokeColor}
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${scoreColor}`}>
              {score}%
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-secondary p-1 rounded-lg">
          {["overview", "laws", "precedents", "arguments"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 text-xs py-1.5 px-2 rounded-md capitalize font-medium transition-colors ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <TrendingUp size={16} /> Summary
              </h3>
              <p className="text-sm leading-relaxed text-foreground">{analysisResult.overview}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                <AlertCircle size={16} /> Identified Gaps
              </h3>
              <ul className="space-y-2">
                {analysisResult.gaps.map((gap, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2 bg-destructive/10 text-destructive p-3 rounded-md">
                    <div className="mt-0.5">•</div>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === "laws" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <BookOpen size={16} /> Applicable Laws
            </h3>
            {analysisResult.laws.map((law, idx) => (
              <div key={idx} className="p-3 bg-secondary rounded-lg border border-border">
                <div className="inline-block px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded mb-2">
                  {law.section}
                </div>
                <p className="text-sm text-foreground">{law.description}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "precedents" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Scale size={16} /> Similar Cases
            </h3>
            {analysisResult.precedents.map((prec, idx) => (
              <div key={idx} className="border border-border rounded-lg overflow-hidden bg-card">
                <button
                  className="w-full text-left p-3 bg-secondary/50 hover:bg-secondary flex justify-between items-center transition-colors"
                  onClick={() => setExpandedPrecedent(expandedPrecedent === idx ? null : idx)}
                >
                  <span className="text-sm font-medium text-foreground">{prec.name}</span>
                  {expandedPrecedent === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expandedPrecedent === idx && (
                  <div className="p-3 border-t border-border text-sm text-foreground bg-background">
                    <p><span className="font-semibold">Relevance:</span> {prec.relevance}</p>
                    {prec.url && (
                      <a href={prec.url} target="_blank" rel="noreferrer" className="text-accent hover:underline mt-2 inline-block">
                        View Judgment
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "arguments" && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Swords size={16} /> Argument Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 p-2 rounded text-center">Plaintiff</div>
                <ul className="space-y-2 text-sm text-foreground bg-secondary/50 p-3 rounded-lg border border-border min-h-[150px]">
                  {analysisResult.arguments.plaintiff.map((arg, idx) => (
                    <li key={idx} className="flex gap-2"><span className="text-green-500 font-bold">+</span>{arg}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded text-center">Defendant</div>
                <ul className="space-y-2 text-sm text-foreground bg-secondary/50 p-3 rounded-lg border border-border min-h-[150px]">
                  {analysisResult.arguments.defendant.map((arg, idx) => (
                    <li key={idx} className="flex gap-2"><span className="text-red-500 font-bold">-</span>{arg}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
