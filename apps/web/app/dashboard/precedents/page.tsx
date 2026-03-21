"use client";

import { Scale, ExternalLink, ChevronDown, ChevronUp, Search, Loader2 } from "lucide-react";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PrecedentResult {
  case_name: string;
  citation: string;
  court: string;
  year: number | null;
  similarity_score: number;
  outcome: string;
  key_reasoning: string;
  relevance_note: string;
}

export default function PrecedentsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PrecedentResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch(`${API}/api/v1/precedents/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_description: query, top_k: 10 }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setResults(data.similar_cases || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scale className="text-accent" /> Legal Precedents
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Search for similar case judgments and landmark rulings.
          </p>
        </div>

        <div className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Describe your case to find similar precedents..."
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>

        {isSearching ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 text-sm">Search failed: {error}</p>
            <button onClick={handleSearch} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
              Retry
            </button>
          </div>
        ) : !hasSearched ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">⚖️</p>
            <h3 className="text-lg font-semibold text-foreground mb-1">Search for precedents</h3>
            <p className="text-sm text-muted-foreground">Describe your case to find similar judgments from Indian courts.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <h3 className="text-lg font-semibold text-foreground mb-1">No precedents found</h3>
            <p className="text-sm text-muted-foreground">Try rephrasing your query with different keywords.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((p, idx) => (
              <div key={idx} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setExpanded(expanded === idx ? null : idx)}
                  className="w-full flex items-start justify-between p-4 hover:bg-secondary/40 transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-foreground text-sm">{p.case_name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.court} {p.year ? `· ${p.year}` : ""} {p.citation ? `· ${p.citation}` : ""}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                        Score: {p.similarity_score}/10
                      </span>
                      {p.outcome && (
                        <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">
                          {p.outcome}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 mt-1 flex-shrink-0">
                    {expanded === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                {expanded === idx && (
                  <div className="p-4 border-t border-border bg-background/50 text-sm text-foreground leading-relaxed">
                    {p.key_reasoning && (
                      <div className="mb-3">
                        <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Key Reasoning</span>
                        <p className="mt-1">{p.key_reasoning}</p>
                      </div>
                    )}
                    {p.relevance_note && (
                      <div className="mb-3">
                        <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Relevance</span>
                        <p className="mt-1">{p.relevance_note}</p>
                      </div>
                    )}
                    <a
                      href={`https://indiankanoon.org/search/?formInput=${encodeURIComponent(p.case_name)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline flex items-center gap-1 text-xs mt-2"
                    >
                      <ExternalLink size={12} /> View on Indian Kanoon
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
