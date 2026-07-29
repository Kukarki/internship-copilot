"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

export function ScoreJobsButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/jobs/score", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scoring failed");
      setMsg(`Scored ${data.scored}. ${data.remaining} left.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      <Button onClick={run} disabled={loading} variant="secondary">
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scoring...</>
        ) : (
          <><Sparkles className="mr-2 h-4 w-4" /> Score my matches</>
        )}
      </Button>
    </div>
  );
}