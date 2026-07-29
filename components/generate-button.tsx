"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, FileUser } from "lucide-react";

function Output({ text }: { text: string }) {
  return (
    <div className="mt-2 p-3 rounded border bg-muted/40 text-sm whitespace-pre-wrap">
      {text}
      <div className="pt-2">
        <button
          className="text-xs underline text-muted-foreground"
          onClick={() => navigator.clipboard.writeText(text)}
        >
          Copy
        </button>
      </div>
    </div>
  );
}

export function GenerateButton({ jobId }: { jobId: string }) {
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [loadingResume, setLoadingResume] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  const [resume, setResume] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      {letter && <Output text={letter} />}
      {resume && <Output text={resume} />}
    </div>
  );
}