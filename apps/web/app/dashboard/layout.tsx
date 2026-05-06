"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, FolderOpen, Scale, FileSignature, Settings } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: "New Case", icon: <FileText size={20} />, href: "/dashboard" },
    { label: "My Cases", icon: <FolderOpen size={20} />, href: "/dashboard/cases" },
    { label: "Precedents", icon: <Scale size={20} />, href: "/dashboard/precedents" },
    { label: "Drafts", icon: <FileSignature size={20} />, href: "/dashboard/drafts" },
    { label: "Settings", icon: <Settings size={20} />, href: "/dashboard/settings" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-primary tracking-tight">Lex<span className="text-accent">AI</span></h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
