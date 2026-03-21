"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, FileText, Clock, TrendingUp } from "lucide-react";
import { getSessionId, DOMAIN_COLORS_HEX } from "../../../../packages/shared/index";

interface LawSection { act: string; section: string; title: string }

interface Case {
  id: string;
  title: string;
  domain: string;
  status: string;
  strength_score: number | null;
  first_message: string;
  message_count: number;
  applicable_laws: LawSection[] | null;
  created_at: string;
}

interface Stats {
  total_cases: number;
  active_cases: number;
  avg_strength: number | null;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DOMAIN_COLORS: Record<string, string> = DOMAIN_COLORS_HEX;

const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  under_review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [stats, setStats] = useState<Stats>({ total_cases: 0, active_cases: 0, avg_strength: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const sid = getSessionId();
    if (!sid) { setIsLoading(false); return; }

    try {
      const res = await fetch(`${API}/api/v1/cases?session_id=${sid}&limit=100`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setCases(data.cases || []);
      setStats(data.stats || { total_cases: 0, active_cases: 0, avg_strength: null });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

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
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <FileText size={16} /> New Case
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 text-sm">Failed to load cases: {error}</p>
            <button onClick={fetchCases} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Total Cases", value: stats.total_cases.toString(), icon: <FolderOpen size={20} className="text-accent" /> },
                { label: "Active", value: stats.active_cases.toString(), icon: <Clock size={20} className="text-green-500" /> },
                { label: "Avg. Strength", value: stats.avg_strength != null ? `${stats.avg_strength}%` : "—", icon: <TrendingUp size={20} className="text-blue-500" /> },
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

            <div className="space-y-3">
              {cases.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                  <p className="text-4xl mb-3">📭</p>
                  <h3 className="text-lg font-semibold text-foreground mb-1">No cases yet</h3>
                  <p className="text-sm text-muted-foreground">Start a new case to see your legal history here.</p>
                </div>
              ) : (
                cases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/dashboard?case_id=${c.id}`)}
                    className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-accent/50 transition-colors shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-secondary rounded-lg" style={{ borderLeft: `3px solid ${DOMAIN_COLORS[c.domain] || "#6B7280"}` }}>
                        <FileText className="text-primary w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{c.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {c.domain} &nbsp;·&nbsp; {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          &nbsp;·&nbsp; {c.message_count} message{c.message_count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[c.status] || statusColor.active}`}>
                        {c.status}
                      </span>
                      <div className="text-sm font-bold text-muted-foreground w-12 text-right">
                        {c.strength_score != null ? `${c.strength_score}%` : "—"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
