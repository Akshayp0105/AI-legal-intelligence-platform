// Precedents v1.0.1 - Enhanced search
"use client";

import { Scale, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const PRECEDENTS = [
  {
    name: "Mohd. Shamim v. Nahid Begum (AIR 2014 SC 281)",
    court: "Supreme Court of India",
    year: 2014,
    tags: ["Family Law", "Maintenance"],
    summary:
      "The Supreme Court upheld the right of a Muslim woman to claim maintenance under Section 125 of CrPC, overriding the Muslim Women (Protection of Rights on Divorce) Act.",
  },
  {
    name: "State of Maharashtra v. Suresh (2000) 1 SCC 471",
    court: "Supreme Court of India",
    year: 2000,
    tags: ["Criminal", "Circumstantial Evidence"],
    summary:
      "Laid down the five cardinal principles ('panchsheel') for conviction based solely on circumstantial evidence. A chain of evidence must be complete with no missing link.",
  },
  {
    name: "Vishaka v. State of Rajasthan (AIR 1997 SC 3011)",
    court: "Supreme Court of India",
    year: 1997,
    tags: ["Constitutional", "Workplace Rights"],
    summary:
      "Landmark judgment that established guidelines for preventing sexual harassment at the workplace, which later led to the POSH Act.",
  },
  {
    name: "K.S. Puttaswamy v. Union of India (2017) 10 SCC 1",
    court: "Supreme Court of India",
    year: 2017,
    tags: ["Constitutional", "Privacy"],
    summary:
      "Nine-judge bench unanimously held that the right to privacy is a fundamental right under Article 21 of the Constitution of India.",
  },
];

export default function PrecedentsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scale className="text-accent" /> Legal Precedents
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Landmark judgments from Indian courts.
          </p>
        </div>

        <div className="space-y-3">
          {PRECEDENTS.map((p, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => setExpanded(expanded === idx ? null : idx)}
                className="w-full flex items-start justify-between p-4 hover:bg-secondary/40 transition-colors text-left"
              >
                <div>
                  <div className="font-semibold text-foreground text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.court} &nbsp;·&nbsp; {p.year}
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {p.tags.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ml-4 mt-1 flex-shrink-0">
                  {expanded === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>
              {expanded === idx && (
                <div className="p-4 border-t border-border bg-background/50 text-sm text-foreground leading-relaxed flex justify-between gap-4">
                  <p>{p.summary}</p>
                  <a
                    href={`https://indiankanoon.org/search/?formInput=${encodeURIComponent(p.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline flex-shrink-0 flex items-center gap-1 text-xs mt-1"
                  >
                    <ExternalLink size={12} /> Indian Kanoon
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
