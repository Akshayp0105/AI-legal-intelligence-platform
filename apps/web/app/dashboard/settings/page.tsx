// Settings v1.0.1 - Enhanced options
"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { User, Shield, Bell, LogOut, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <User className="text-accent" /> Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences.</p>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="avatar" className="w-16 h-16 rounded-full border-2 border-accent" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                {user?.firstName?.[0] ?? "U"}
              </div>
            )}
            <div>
              <div className="text-lg font-semibold text-foreground">
                {user?.fullName ?? "User"}
              </div>
              <div className="text-sm text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress ?? ""}
              </div>
              <div className="mt-1 text-xs inline-block px-2 py-0.5 bg-accent/10 text-accent rounded-full font-medium">
                Legal Practitioner
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {[
            {
              icon: <Shield size={18} className="text-blue-500" />,
              title: "Security & Privacy",
              desc: "Manage passwords and two-factor authentication.",
            },
            {
              icon: <Bell size={18} className="text-yellow-500" />,
              title: "Notifications",
              desc: "Configure email and in-app notification preferences.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-accent/50 transition-colors cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">{item.icon}</div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </div>
          ))}
        </div>

        {/* API Keys Section */}
        <div className="bg-card border border-border rounded-xl p-5 mt-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield size={16} className="text-accent" /> API Configuration
          </h2>
          <div className="space-y-3">
            {[
              { label: "Gemini API", status: "Connected", color: "text-green-500" },
              { label: "Qdrant Vector DB", status: "Not Connected", color: "text-red-400" },
              { label: "PostgreSQL", status: "Not Connected", color: "text-red-400" },
            ].map((api) => (
              <div key={api.label} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{api.label}</span>
                <span className={`text-xs font-semibold ${api.color}`}>{api.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={() => signOut()}
          className="mt-6 w-full py-3 bg-destructive/10 text-destructive border border-destructive/30 font-medium rounded-xl hover:bg-destructive hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  );
}
