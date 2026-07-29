"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";

export function ApplyButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setLoading(true); setShot(null); setMsg(null);
    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (data.error) setMsg(data.error);
      if (data.screenshot) setShot(data.screenshot);
      if (data.url) setUrl(data.url);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button size="sm" onClick={run} disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Filling...</>
          : <><Send className="mr-2 h-3 w-3" /> Auto-fill application</>}
      </Button>
      {msg && <p className="text-xs text-amber-600">{msg}</p>}
      {shot && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Filled preview - review, then open the form to finish and submit:</p>
          <img src={shot} alt="filled form preview" className="w-full rounded border max-h-96 object-contain object-top" />
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="text-xs underline text-blue-600">
              Open the real form to review and submit
            </a>
          )}
        </div>
      )}
    </div>
  );
}