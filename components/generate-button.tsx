"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, FileUser, Download, Copy } from "lucide-react";
import { downloadTextPdf } from "@/lib/make-pdf";

function Output({ text, heading, filename }: { text: string; heading: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 rounded-lg border bg-muted/40 text-sm">
      <div className="p-3 whitespace-pre-wrap max-h-72 overflow-auto">{text}</div>
      <div className="flex items-center gap-2 border-t px-3 py-2">
        <button
          onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md hover:bg-accent transition-colors"
        >
          <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={() => downloadTextPdf(filename, heading, text)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md grad-bg text-white font-medium"
        >
          <Download className="h-3 w-3" /> Download PDF
        </button>
      </div>
    </div>
  );
}

export function GenerateButton({ jobId, jobTitle, company }: { jobId: string; jobTitle?: string; company?: string }) {
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [loadingResume, setLoadingResume] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  const [resume, setResume] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slug = (company || "job").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

  async function call(path: string, set: (v: string) => void, setLoad: (b: boolean) => void, key: string) {
    setLoad(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      set(data[key]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoad(false);
    }
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={loadingLetter}
          onClick={() => call("/api/jobs/generate", setLetter, setLoadingLetter, "coverLetter")}>
          {loadingLetter ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Writing...</>
            : <><FileText className="mr-2 h-3 w-3" /> Cover letter</>}
        </Button>
        <Button size="sm" variant="outline" disabled={loadingResume}
          onClick={() => call("/api/jobs/tailor", setResume, setLoadingResume, "tailored")}>
          {loadingResume ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Tailoring...</>
            : <><FileUser className="mr-2 h-3 w-3" /> Tailor resume</>}
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {letter && <Output text={letter} heading={`Cover Letter${company ? " - " + company : ""}`} filename={`cover-letter-${slug}`} />}
      {resume && <Output text={resume} heading="Resume" filename={`resume-${slug}`} />}
    </div>
  );
}