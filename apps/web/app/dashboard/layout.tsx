"use client";
import { usePathname, useRouter } from "next/navigation";
// ─── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({ item, currentPath }: { item: { icon: string; label: string; path: string }; currentPath: string }) {
  const isActive =
    currentPath === item.path ||
    (item.path === "/dashboard" && currentPath === "/dashboard");

  return (
    <a
      href={item.path}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "8px",
        textDecoration: "none",
        background: isActive ? "rgba(212,160,23,0.12)" : "transparent",
        color: isActive ? "var(--amber)" : "rgba(255,255,255,0.55)",
        fontSize: "14px",
        fontWeight: isActive ? 500 : 400,
        transition: "all var(--duration-fast) var(--ease-out)",
        borderLeft: isActive ? "2px solid var(--amber)" : "2px solid transparent",
        fontFamily: "var(--font-body)",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.color = "rgba(255,255,255,0.85)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "rgba(255,255,255,0.55)";
        }
      }}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={item.icon} />
      </svg>
      {item.label}
    </a>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: "My Cases",    path: "/dashboard/cases",      soon: false },
  { icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3", label: "Precedents",  path: "/dashboard/precedents", soon: false },
  { icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", label: "Drafts",      path: "/dashboard/drafts",     soon: false },
  { icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", label: "Upload Docs", path: "/dashboard/upload",     soon: false },
  { icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", label: "Settings",    path: "/dashboard/settings",   soon: false },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const handleNewCase = () => router.push("/dashboard");
  const totalMessages = "0";
  const detectedDomain = "—";

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside style={{
        width: "260px", minHeight: "100vh", flexShrink: 0,
        background: "var(--navy)",
        display: "flex", flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        position: "relative", overflow: "hidden",
      }}>

        {/* Noise texture for depth */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          opacity: 0.4,
        }} />

        {/* Top amber accent line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "1.5px",
          background: "linear-gradient(90deg, transparent 0%, var(--amber) 40%, rgba(212,160,23,0.4) 100%)",
        }} />

        {/* ── Logo ─────────────────────────────────────────────── */}
        <div style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 600,
              letterSpacing: "-0.5px", lineHeight: 1, marginBottom: "5px",
            }}>
              <span style={{ color: "#fff" }}>Lex</span>
              <span style={{ color: "var(--amber)" }}>AI</span>
            </h1>
            <p style={{
              fontSize: "9.5px", color: "rgba(255,255,255,0.28)",
              letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500,
            }}>
              Legal Intelligence Platform
            </p>
          </div>
          {/* Beta badge */}
          <span style={{
            fontSize: "9px", padding: "3px 7px", borderRadius: "6px",
            background: "rgba(212,160,23,0.12)", color: "rgba(212,160,23,0.7)",
            border: "1px solid rgba(212,160,23,0.2)", fontWeight: 600,
            letterSpacing: "0.06em", marginTop: "4px",
          }}>BETA</span>
        </div>

        {/* ── New Case button ───────────────────────────────────── */}
        <div style={{ padding: "16px 14px 8px" }}>
          <button
            onClick={handleNewCase}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "9px",
              padding: "11px 16px", borderRadius: "12px",
              background: "var(--amber)", border: "none", cursor: "pointer",
              color: "var(--navy)", fontWeight: 600, fontSize: "14px",
              fontFamily: "var(--font-body)",
              boxShadow: "0 4px 16px rgba(212,160,23,0.35), 0 1px 3px rgba(212,160,23,0.2)",
              transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
              letterSpacing: "-0.1px",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--amber-light)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(212,160,23,0.45), 0 2px 6px rgba(212,160,23,0.25)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "var(--amber)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(212,160,23,0.35), 0 1px 3px rgba(212,160,23,0.2)";
            }}
          >
            <div style={{
              width: "20px", height: "20px", borderRadius: "6px",
              background: "rgba(10,22,40,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
              </svg>
            </div>
            New Case
          </button>
        </div>

        {/* ── Nav section label ─────────────────────────────────── */}
        <p style={{
          fontSize: "9.5px", color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.12em", textTransform: "uppercase",
          fontWeight: 600, padding: "16px 20px 6px",
        }}>Navigation</p>

        {/* ── Nav items ─────────────────────────────────────────── */}
        <nav style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: "1px" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || (item.path === "/dashboard/cases" && pathname === "/dashboard");
            return (
              <a
                key={item.path}
                href={item.path}
                aria-label={item.label}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 12px", borderRadius: "10px", textDecoration: "none",
                  position: "relative", overflow: "hidden",
                  background: isActive ? "rgba(212,160,23,0.10)" : "transparent",
                  color: isActive ? "var(--amber)" : "rgba(255,255,255,0.5)",
                  fontSize: "13.5px", fontWeight: isActive ? 500 : 400,
                  letterSpacing: "-0.1px",
                  transition: "all 0.18s ease",
                  borderLeft: isActive ? "2.5px solid var(--amber)" : "2.5px solid transparent",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }
                }}
              >
                {/* Active glow */}
                {isActive && (
                  <div style={{
                    position: "absolute", left: 0, top: "20%", bottom: "20%",
                    width: "2.5px", background: "var(--amber)",
                    boxShadow: "0 0 8px rgba(212,160,23,0.7)",
                    borderRadius: "0 2px 2px 0",
                  }} />
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={isActive ? "2" : "1.75"}
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon}/>
                </svg>
                {item.label}
                {/* Coming soon badge for some items */}
                {item.soon && (
                  <span style={{
                    marginLeft: "auto", fontSize: "9px", padding: "1px 6px",
                    borderRadius: "5px", background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.25)", fontWeight: 500,
                  }}>Soon</span>
                )}
              </a>
            );
          })}
        </nav>

        {/* ── Quick stats ───────────────────────────────────────── */}
        <div style={{
          margin: "auto 14px 0",
          padding: "14px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "0",
        }}>
          <p style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
            This Session
          </p>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {[
              { val: totalMessages || "0", label: "Messages" },
              { val: detectedDomain || "—",  label: "Domain" },
            ].map(stat => (
              <div key={stat.label}>
                <p style={{ fontSize: "18px", fontWeight: 600, color: "#fff",
                  fontFamily: "var(--font-display)", lineHeight: 1 }}>{stat.val}</p>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Account ───────────────────────────────────────────── */}
        <div style={{
          padding: "14px", marginTop: "10px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "9px 10px", borderRadius: "10px", cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            {/* Avatar */}
            <div style={{
              width: "34px", height: "34px", borderRadius: "50%",
              background: "linear-gradient(135deg, var(--amber) 0%, #E8B84B 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: 700, color: "var(--navy)",
              flexShrink: 0, boxShadow: "0 2px 8px rgba(212,160,23,0.3)",
            }}>A</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.85)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                My Account
              </p>
              <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.3)" }}>Free plan</p>
            </div>
            {/* Settings gear */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.25)" strokeWidth="1.75" strokeLinecap="round">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", height: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
