"use client";
import { usePathname, useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

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
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      label: "My Cases",
      path: "/dashboard/cases",
    },
    {
      icon: "M3 6l3 1m0 0l-3 9a5 5 0 006.5 5.5 5 5 0 006.5-5.5l-3-9m-6.5 0l6.5-1m6.5 1l-6.5 1",
      label: "Precedents",
      path: "/dashboard/precedents",
    },
    {
      icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
      label: "Drafts",
      path: "/dashboard/drafts",
    },
    {
      icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
      label: "Upload Docs",
      path: "/dashboard/upload",
    },
    {
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
      label: "Settings",
      path: "/dashboard/settings",
    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--off-white)" }}>
      {/* ─── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: "260px",
          minHeight: "100vh",
          flexShrink: 0,
          background: "var(--navy)",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top amber accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "linear-gradient(90deg, transparent, var(--amber), transparent)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            padding: "28px 24px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "26px",
              fontWeight: 600,
              letterSpacing: "-0.5px",
              lineHeight: 1,
            }}
          >
            <span style={{ color: "#FFFFFF" }}>Lex</span>
            <span style={{ color: "var(--amber)" }}>AI</span>
          </h1>
          <p
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.35)",
              marginTop: "4px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 500,
              fontFamily: "var(--font-body)",
            }}
          >
            Legal Intelligence Platform
          </p>
        </div>

        {/* New Case CTA */}
        <div style={{ padding: "16px 16px 8px" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "11px 16px",
              borderRadius: "10px",
              background: "var(--amber)",
              border: "none",
              cursor: "pointer",
              color: "var(--navy)",
              fontWeight: 600,
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              boxShadow: "var(--shadow-amber)",
              transition: "all var(--duration-base) var(--ease-out)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--amber-light)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--amber)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Case
          </button>
        </div>

        {/* Nav items */}
        <nav
          style={{
            flex: 1,
            padding: "8px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} currentPath={pathname ?? ""} />
          ))}
        </nav>

        {/* User account */}
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "background var(--duration-fast)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <UserButton afterSignOutUrl="/sign-in" />
            <div>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#fff",
                  fontFamily: "var(--font-body)",
                }}
              >
                My Account
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "var(--font-body)",
                }}
              >
                Free plan
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main content ────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          height: "100vh",
        }}
      >
        {children}
      </main>
    </div>
  );
}
