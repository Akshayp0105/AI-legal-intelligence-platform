"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────

interface LawSection { act: string; section: string; title: string }

interface Case {
  id: string;
  title: string;
  domain: string;
  status: "active" | "under_review" | "closed";
  strength_score: number | null;
  summary: string | null;
  first_message: string;
  message_count: number;
  applicable_laws: LawSection[] | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total_cases: number;
  active_cases: number;
  avg_strength: number | null;
}

// ── Constants ─────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DOMAIN_COLORS: Record<string, string> = {
  cyber: "#7C3AED", criminal: "#DC2626", corporate: "#1D4ED8",
  property: "#B45309", family: "#BE185D", consumer: "#047857",
  labour: "#0369A1", constitutional: "#4F46E5", general: "#6B7280",
};

const STATUS_CONFIG = {
  active:       { label: "Active",       bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" },
  under_review: { label: "Under Review", bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" },
  closed:       { label: "Closed",       bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" },
};

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("lexai_session");
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("lexai_session", id); }
  return id;
}

// ── Strength gauge ────────────────────────────────────────

function StrengthRing({ score }: { score: number }) {
  const r = 16; const circ = 2 * Math.PI * r;
  const pct = score / 100;
  const color = score >= 70 ? "#047857" : score >= 45 ? "#B45309" : "#DC2626";
  return (
    <div style={{ position: "relative", width: "44px", height: "44px", flexShrink: 0 }}>
      <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="22" cy="22" r={r} fill="none" stroke="#E5E7EB" strokeWidth="3" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "11px", fontWeight: 700, color,
      }}>{score}%</div>
    </div>
  );
}

// ── Case card ─────────────────────────────────────────────

function CaseCard({ kase, onOpen, onStatusChange }: {
  kase: Case;
  onOpen: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const domainColor = DOMAIN_COLORS[kase.domain] || "#6B7280";
  const statusCfg = STATUS_CONFIG[kase.status] || STATUS_CONFIG.active;
  const date = new Date(kase.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{
        background: "#fff", border: `1.5px solid ${hovered ? domainColor + "40" : "#E5E7EB"}`,
        borderRadius: "16px", padding: "18px 20px",
        cursor: "pointer", transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? `0 8px 24px ${domainColor}15, 0 2px 8px rgba(0,0,0,0.04)` : "0 1px 3px rgba(0,0,0,0.04)",
        borderLeft: `4px solid ${domainColor}`,
        position: "relative",
        animation: "fadeUp 0.4s var(--ease-out) both",
      }}
      onClick={() => onOpen(kase.id)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
        {/* Domain icon */}
        <div style={{
          width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
          background: `${domainColor}12`, border: `1px solid ${domainColor}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px",
        }}>
          {kase.domain === "criminal" ? "⚖️" : kase.domain === "corporate" ? "🏢"
            : kase.domain === "property" ? "🏠" : kase.domain === "family" ? "👨👩👧"
            : kase.domain === "consumer" ? "📦" : kase.domain === "cyber" ? "🛡️"
            : kase.domain === "labour" ? "💼" : "📜"}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <h3 style={{
              fontSize: "15px", fontWeight: 600, color: "#0A1628",
              fontFamily: "var(--font-display)", letterSpacing: "-0.2px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: "420px",
            }}>{kase.title}</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em",
              textTransform: "uppercase", color: domainColor,
            }}>{kase.domain}</span>
            <span style={{ color: "#CBD5E0", fontSize: "10px" }}>•</span>
            <span style={{ fontSize: "12px", color: "#94A3B8" }}>{date}</span>
            <span style={{ color: "#CBD5E0", fontSize: "10px" }}>•</span>
            <span style={{ fontSize: "12px", color: "#94A3B8" }}>
              {kase.message_count} message{kase.message_count !== 1 ? "s" : ""}
            </span>
          </div>
          {/* Laws preview */}
          {kase.applicable_laws && kase.applicable_laws.length > 0 && (
            <div style={{ display: "flex", gap: "5px", marginTop: "8px", flexWrap: "wrap" }}>
              {kase.applicable_laws.slice(0, 3).map((law, i) => (
                <span key={i} style={{
                  fontSize: "10px", padding: "2px 8px", borderRadius: "6px",
                  background: "#0A1628", color: "#D4A017", fontWeight: 600,
                }}>
                  {law.act}{law.section ? ` §${law.section}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", flexShrink: 0 }}>
          {/* Status badge */}
          <span style={{
            fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px",
            background: statusCfg.bg, color: statusCfg.color,
            border: `1px solid ${statusCfg.border}`,
          }}>{statusCfg.label}</span>

          {/* Strength ring or placeholder */}
          {kase.strength_score != null ? (
            <StrengthRing score={kase.strength_score} />
          ) : (
            <div style={{ fontSize: "11px", color: "#CBD5E0" }}>No score</div>
          )}
        </div>

        {/* 3-dot menu */}
        <div style={{ position: "relative" }}
          onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}>
          <button style={{
            width: "28px", height: "28px", borderRadius: "6px", border: "none",
            background: menuOpen ? "#F3F4F6" : "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#94A3B8", fontSize: "16px", flexShrink: 0,
          }}>⋯</button>
          {menuOpen && (
            <div style={{
              position: "absolute", right: 0, top: "32px", zIndex: 10,
              background: "#fff", border: "1px solid #E5E7EB", borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)", overflow: "hidden",
              minWidth: "150px",
            }}>
              {["active", "under_review", "closed"].map(s => (
                <button key={s}
                  onClick={e => { e.stopPropagation(); onStatusChange(kase.id, s); setMenuOpen(false); }}
                  style={{
                    display: "block", width: "100%", padding: "9px 14px",
                    background: kase.status === s ? "#F9FAFB" : "transparent",
                    border: "none", textAlign: "left", cursor: "pointer",
                    fontSize: "13px", color: kase.status === s ? "#0A1628" : "#6B7280",
                    fontWeight: kase.status === s ? 500 : 400,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                  onMouseLeave={e => e.currentTarget.style.background = kase.status === s ? "#F9FAFB" : "transparent"}
                >
                  {STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].label}
                  {kase.status === s && " ✓"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────

export default function MyCasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [stats, setStats] = useState<Stats>({ total_cases: 0, active_cases: 0, avg_strength: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "under_review" | "closed">("all");
  const [search, setSearch] = useState("");

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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleStatusChange = async (caseId: string, status: string) => {
    const sid = getSessionId();
    try {
      await fetch(`${API}/api/v1/cases/${caseId}/status?session_id=${sid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: status as any } : c));
    } catch (e) { console.error("Status update failed", e); }
  };

  const handleOpenCase = (caseId: string) => {
    // Navigate to dashboard with case pre-loaded
    router.push(`/dashboard?case_id=${caseId}`);
  };

  // Filter + search
  const filtered = cases.filter(c => {
    const matchStatus = filter === "all" || c.status === filter;
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase())
      || c.domain.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div style={{ flex: 1, background: "var(--off-white)", minHeight: "100vh", fontFamily: "var(--font-body)" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        padding: "28px 36px 0", background: "#fff",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 500,
              color: "var(--navy)", letterSpacing: "-0.4px", marginBottom: "4px",
            }}>
              📁 My Cases
            </h1>
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              All your active and past legal matters.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 18px", borderRadius: "12px",
              background: "var(--navy)", border: "none", cursor: "pointer",
              color: "#fff", fontSize: "14px", fontWeight: 500,
              fontFamily: "var(--font-body)",
              boxShadow: "var(--shadow-md)",
              transition: "all 0.2s var(--ease-out)",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "#112240"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "var(--navy)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Case
          </button>
        </div>

        {/* ── Filter tabs ─────────────────────────────────── */}
        <div style={{ display: "flex", gap: "0" }}>
          {(["all", "active", "under_review", "closed"] as const).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 16px", border: "none", background: "transparent",
                fontSize: "13px", fontWeight: filter === f ? 600 : 400, cursor: "pointer",
                color: filter === f ? "var(--navy)" : "var(--text-muted)",
                borderBottom: filter === f ? "2px solid var(--navy)" : "2px solid transparent",
                transition: "all 0.15s", fontFamily: "var(--font-body)",
              }}>
              {f === "all" ? "All Cases" : f === "under_review" ? "Under Review" : f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "all" && <span style={{ marginLeft: "6px", fontSize: "11px",
                padding: "1px 6px", borderRadius: "10px",
                background: filter==="all" ? "var(--navy)" : "#E5E7EB",
                color: filter==="all" ? "#fff" : "var(--text-muted)" }}>{cases.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "28px 36px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* ── Stat cards ──────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
          {[
            { icon: "📁", value: stats.total_cases.toString(), label: "Total Cases",    color: "#1D4ED8" },
            { icon: "⚡", value: stats.active_cases.toString(), label: "Active",        color: "#047857" },
            { icon: "📊", value: stats.avg_strength != null ? `${stats.avg_strength}%` : "—", label: "Avg. Strength", color: "#B45309" },
          ].map((stat, i) => (
            <div key={i} style={{
              background: "#fff", border: "1px solid var(--border)", borderRadius: "14px",
              padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px",
              boxShadow: "var(--shadow-sm)",
              animation: `fadeUp 0.4s ${i*80}ms var(--ease-out) both`,
            }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px", fontSize: "20px",
                background: `${stat.color}10`, border: `1px solid ${stat.color}20`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{stat.icon}</div>
              <div>
                <p style={{ fontSize: "26px", fontWeight: 700, color: "var(--navy)",
                  fontFamily: "var(--font-display)", lineHeight: 1 }}>{stat.value}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search ─────────────────────────────────────── */}
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#94A3B8" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cases by title or domain..."
            style={{
              width: "100%", padding: "11px 14px 11px 40px", borderRadius: "12px",
              border: "1.5px solid var(--border-strong)", background: "#fff",
              fontSize: "14px", fontFamily: "var(--font-body)", color: "var(--text-primary)",
              outline: "none", transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "var(--navy)"}
            onBlur={e => e.target.style.borderColor = "var(--border-strong)"}
          />
        </div>

        {/* ── Cases list ──────────────────────────────────── */}
        {isLoading ? (
          // Skeleton loader
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: "90px", borderRadius: "16px",
                background: "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)",
                backgroundSize: "400px 100%",
                animation: "shimmer 1.4s ease-in-out infinite",
              }} />
            ))}
            <style>{`@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }`}</style>
          </div>
        ) : error ? (
          <div style={{
            padding: "24px", borderRadius: "14px", background: "#FEF2F2",
            border: "1px solid #FECACA", textAlign: "center",
          }}>
            <p style={{ color: "#DC2626", fontSize: "14px" }}>Failed to load cases: {error}</p>
            <button onClick={fetchCases} style={{
              marginTop: "10px", padding: "7px 16px", borderRadius: "8px",
              background: "#DC2626", color: "#fff", border: "none", cursor: "pointer", fontSize: "13px",
            }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: "60px 24px", textAlign: "center",
            background: "#fff", borderRadius: "16px", border: "1px solid var(--border)",
          }}>
            <p style={{ fontSize: "40px", marginBottom: "12px" }}>📭</p>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--navy)", marginBottom: "6px" }}>
              {search ? "No cases match your search" : "No cases yet"}
            </h3>
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              {search ? "Try a different search term" : "Start a new case to see your legal history here."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((kase, i) => (
              <div key={kase.id} style={{ animationDelay: `${i * 50}ms` }}>
                <CaseCard
                  kase={kase}
                  onOpen={handleOpenCase}
                  onStatusChange={handleStatusChange}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  );
}
