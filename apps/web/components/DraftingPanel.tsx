// DraftingPanel v1.0.1 - Enhanced document templates
"use client";

// DraftingPanel v1.0.1 - Enhanced document templates
import { useState } from "react";
import { FileSignature, Download, Loader2, Sparkles, Languages } from "lucide-react";

export default function DraftingPanel() {
  const [docType, setDocType] = useState("legal_notice");
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftPreview, setDraftPreview] = useState<string>("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate generation delay
    await new Promise((r) => setTimeout(r, 2000));
    
    let mockDraft = "";
    if (docType === "legal_notice") {
      mockDraft = `LEGAL NOTICE\n\nDate: [Current Date]\n\nTo,\n[Recipient Name]\n[Recipient Address]\n\nFrom,\n[Sender Name]\n[Sender Address]\n\nSubject: Legal Notice regarding pending dues.\n\nSir/Madam,\n\nUnder instructions from and on behalf of my client [Sender Name], I hereby serve upon you the following legal notice:\n\n1. That my client had entered into an agreement with you...\n2. That you have failed to make the payment of Rs. [Amount]...\n\nPlease take notice that if you fail to comply with this notice within 15 days of receipt, my client will be constrained to initiate legal proceedings against you in a competent court of law, entirely at your own risk as to costs and consequences.\n\nYours faithfully,\n\n__________________\nAdvocate`;
    } else {
      mockDraft = `[Generated Draft for ${docType}]\n\nDetails will appear here based on case context...`;
    }
    
    setDraftPreview(mockDraft);
    setIsGenerating(false);
  };

  return (
    <div className="flex h-full bg-background">
      {/* Left sidebar for controls */}
      <div className="w-1/3 min-w-[300px] border-r border-border p-6 bg-card flex flex-col h-full overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-primary flex items-center gap-2 mb-1">
            <FileSignature className="text-accent" /> Draft Assistant
          </h2>
          <p className="text-sm text-muted-foreground">Auto-generate formal legal documents.</p>
        </div>

        <div className="space-y-5 flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
            >
              <option value="legal_notice">Legal Notice</option>
              <option value="fir">FIR Draft</option>
              <option value="bail_application">Bail Application</option>
              <option value="consumer_complaint">Consumer Complaint</option>
              <option value="rti">RTI Application</option>
              <option value="vakalatnama">Vakalatnama</option>
              <option value="petition">Writ Petition</option>
            </select>
          </div>

          {/* Dynamic fields simulation */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-secondary/30">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parameters</h3>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Language</label>
              <select className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm outline-none">
                <option value="en">English</option>
                <option value="ml">Malayalam</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Tone</label>
              <select className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm outline-none">
                <option value="formal">Formal</option>
                <option value="urgent">Urgent / Strict</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
          >
            {isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5 text-accent" />}
            {isGenerating ? "Drafting..." : "Generate Draft"}
          </button>
        </div>
      </div>

      {/* Right side for Live Preview */}
      <div className="flex-1 flex flex-col h-full bg-muted/10 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-foreground">Live Preview</h3>
          <div className="flex gap-2">
            <button
              disabled={!draftPreview}
              className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2 border border-border disabled:opacity-50"
            >
              <Languages size={16} /> Translate
            </button>
            <button
              disabled={!draftPreview}
              className="px-4 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Download size={16} /> Download DOCX
            </button>
          </div>
        </div>

        <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          {draftPreview ? (
            <textarea
              className="flex-1 w-full p-6 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 font-serif bg-card text-foreground"
              value={draftPreview}
              onChange={(e) => setDraftPreview(e.target.value)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <FileSignature className="w-16 h-16 opacity-20 mb-4" />
              <p>Configure parameters and click Generate Draft</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
