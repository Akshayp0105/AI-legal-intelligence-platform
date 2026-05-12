"use client";

import { useState, useCallback } from "react";
import { UploadCloud, FileText, CheckCircle, Loader2, X } from "lucide-react";

interface UploadedDoc {
  id: string;
  name: string;
  size: string;
  status: "uploading" | "extracting" | "ready" | "error";
  progress: number;
}

export default function DocumentUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    const docId = Math.random().toString(36).substr(2, 9);
    const newDoc: UploadedDoc = {
      id: docId,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + " MB",
      status: "uploading",
      progress: 0,
    };

    setDocuments((prev) => [...prev, newDoc]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", "evidence");

      // XHR for progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents/upload`, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setDocuments((prev) =>
            prev.map((doc) => (doc.id === docId ? { ...doc, progress: percentComplete } : doc))
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setDocuments((prev) =>
            prev.map((doc) => (doc.id === docId ? { ...doc, status: "ready", progress: 100 } : doc))
          );
        } else {
          setDocuments((prev) =>
            prev.map((doc) => (doc.id === docId ? { ...doc, status: "error" } : doc))
          );
        }
      };

      xhr.onerror = () => {
        setDocuments((prev) =>
          prev.map((doc) => (doc.id === docId ? { ...doc, status: "error" } : doc))
        );
      };

      xhr.send(formData);

    } catch (error) {
      console.error("Upload failed", error);
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === docId ? { ...doc, status: "error" } : doc))
      );
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processFile);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(processFile);
    }
  };

  const removeDoc = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-card rounded-xl border border-border shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-primary mb-1">Upload Documents</h2>
        <p className="text-sm text-muted-foreground">Upload PDFs or Images for OCR and analysis.</p>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50 bg-secondary/30"
        }`}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileInput}
        />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-background rounded-full shadow-sm">
            <UploadCloud className="w-8 h-8 text-accent" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              Drag & drop files or <span className="text-accent underline cursor-pointer">Browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Supports PDF, PNG, JPG (Max 20MB)</p>
          </div>
        </div>
      </div>

      {documents.length > 0 && (
        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Uploaded Documents</h3>
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-4 p-4 bg-background border border-border rounded-lg shadow-sm">
              <div className="p-2 bg-secondary rounded-md text-primary">
                <FileText size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                  <button onClick={() => removeDoc(doc.id)} className="text-muted-foreground hover:text-destructive">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>{doc.size}</span>
                  <span>•</span>
                  {doc.status === "uploading" && <span className="text-blue-500">Uploading...</span>}
                  {doc.status === "extracting" && (
                    <span className="text-accent flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> Extracting text...
                    </span>
                  )}
                  {doc.status === "ready" && (
                    <span className="text-green-500 flex items-center gap-1">
                      <CheckCircle size={12} /> Document ready
                    </span>
                  )}
                </div>

                {doc.status !== "ready" && (
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${doc.status === "extracting" ? "bg-accent animate-pulse w-full" : "bg-blue-500"}`} 
                      style={{ width: doc.status === "uploading" ? `${doc.progress}%` : "100%" }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
