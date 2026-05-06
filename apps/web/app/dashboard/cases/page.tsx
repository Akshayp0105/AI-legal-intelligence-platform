"use client";

import { FolderOpen, FileText, Clock, TrendingUp } from "lucide-react";

const MOCK_CASES = [
  {
    id: "1",
    title: "Property Dispute – Sharma vs. Verma",
    type: "Civil",
    status: "Active",
    date: "2026-05-01",
    score: 72,
  },
  {
    id: "2",
    title: "IPC §302 Murder – State vs. Raju",
    type: "Criminal",
    status: "Under Review",
    date: "2026-04-28",
    score: 55,
  },
  {
    id: "3",
    title: "Consumer Complaint – Tech Corp",
    type: "Consumer",
    status: "Closed",
    date: "2026-04-15",
    score: 88,
  },
];

const statusColor: Record<string, string> = {
  Active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Under Review": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function CasesPage() {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="text-accent" /> My Cases
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              All your active and past legal matters.
            </p>
          </div>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <FileText size={16} /> New Case
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Cases", value: "3", icon: <FolderOpen size={20} className="text-accent" /> },
            { label: "Active", value: "1", icon: <Clock size={20} className="text-green-500" /> },
            { label: "Avg. Strength", value: "72%", icon: <TrendingUp size={20} className="text-blue-500" /> },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="p-2 bg-secondary rounded-lg">{s.icon}</div>
              <div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Cases List */}
        <div className="space-y-3">
          {MOCK_CASES.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-accent/50 transition-colors shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-secondary rounded-lg">
                  <FileText className="text-primary w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">{c.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {c.type} &nbsp;·&nbsp; {c.date}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[c.status]}`}>
                  {c.status}
                </span>
                <div className="text-sm font-bold text-muted-foreground w-12 text-right">
                  {c.score}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
