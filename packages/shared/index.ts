export const API_VERSION = "1.2.0";

export const DOMAINS = [
  "criminal",
  "corporate",
  "property",
  "family",
  "consumer",
  "labour",
  "constitutional",
  "cyber",
  "contract",
  "general",
] as const;

export type LegalDomain = (typeof DOMAINS)[number];

export interface AnalysisResult {
  conversational_reply: string;
  domain: LegalDomain;
  applicable_laws: ApplicableLaw[];
  practical_steps: string[];
  key_rights: string[];
  documents_needed: string[];
  limitation_period: string;
  jurisdiction: string;
  needs_advocate: boolean;
  advocate_urgency: "low" | "medium" | "high";
  draft_suggestions: string[];
  disclaimer: string;
}

export interface ApplicableLaw {
  act: string;
  section: string;
  description: string;
  relevance: number;
}

export interface Case {
  id: string;
  title: string;
  domain: LegalDomain;
  status: "active" | "under_review" | "closed";
  strength_score: number;
  summary: string;
  message_count: number;
  created_at: string;
}

export const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  under_review: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-100 text-gray-800",
};

export const DOMAIN_COLORS: Record<LegalDomain, string> = {
  criminal: "bg-red-100 text-red-800",
  corporate: "bg-blue-100 text-blue-800",
  property: "bg-amber-100 text-amber-800",
  family: "bg-pink-100 text-pink-800",
  consumer: "bg-green-100 text-green-800",
  labour: "bg-sky-100 text-sky-800",
  constitutional: "bg-purple-100 text-purple-800",
  cyber: "bg-violet-100 text-violet-800",
  contract: "bg-indigo-100 text-indigo-800",
  general: "bg-gray-100 text-gray-800",
};

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function getStrengthColor(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
