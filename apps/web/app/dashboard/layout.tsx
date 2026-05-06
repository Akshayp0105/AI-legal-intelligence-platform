"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { FileText, FolderOpen, Scale, FileSignature, Settings, UploadCloud } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: "New Case", icon: <FileText size={20} />, href: "/dashboard" },
    { label: "My Cases", icon: <FolderOpen size={20} />, href: "/dashboard/cases" },
    { label: "Precedents", icon: <Scale size={20} />, href: "/dashboard/precedents" },
    { label: "Drafts", icon: <FileSignature size={20} />, href: "/dashboard/drafts" },
    { label: "Upload Docs", icon: <UploadCloud size={20} />, href: "/dashboard/upload" },
    { label: "Settings", icon: <Settings size={20} />, href: "/dashboard/settings" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-primary tracking-tight">Lex<span className="text-accent">AI</span></h1>
          <p className="text-xs text-muted-foreground mt-0.5">Legal Intelligence Platform</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                pathname === item.href
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
        {/* User Profile at bottom */}
        <div className="p-4 border-t border-border flex items-center gap-3">
          <UserButton afterSignOutUrl="/sign-in" />
          <span className="text-xs text-muted-foreground">My Account</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
