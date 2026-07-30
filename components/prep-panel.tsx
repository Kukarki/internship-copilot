"use client";
import { useState } from "react";
import { Loader2, GraduationCap, Code, MessageSquare, HelpCircle, Target } from "lucide-react";

type Prep = {
  technical: { q: string; why: string }[];
  behavioral: { q: string; tip: string }[];
  askThem: string[];
  focusAreas: string[];
};

export function PrepPanel({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [prep, setPrep] = useState<Prep | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/jobs/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPrep(data.prep);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="w-full">
      <button onClick={run} disabled={loading}
        className="grad-bg text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60">
        {loading ? <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing...</span>
          : <span className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5" /> Prep me</span>}
      </button>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {prep && (
        <div className="mt-4 space-y-5 w-full">
          <section>
            <h4 className="flex items-center gap-2 font-semibold text-sm mb-2"><Code className="h-4 w-4 text-primary" /> Technical questions</h4>
            <ol className="space-y-2 list-decimal list-inside">
              {prep.technical?.map((t, i) => (
                <li key={i} className="text-sm">
                  {t.q}
                  <span className="block text-xs text-muted-foreground ml-4">Testing: {t.why}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h4 className="flex items-center gap-2 font-semibold text-sm mb-2"><MessageSquare className="h-4 w-4 text-primary" /> Behavioral questions</h4>
            <ol className="space-y-2 list-decimal list-inside">
              {prep.behavioral?.map((b, i) => (
                <li key={i} className="text-sm">
                  {b.q}
                  <span className="block text-xs text-muted-foreground ml-4">Tip: {b.tip}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h4 className="flex items-center gap-2 font-semibold text-sm mb-2"><HelpCircle className="h-4 w-4 text-primary" /> Ask them</h4>
            <ul className="space-y-1 list-disc list-inside">
              {prep.askThem?.map((a, i) => <li key={i} className="text-sm">{a}</li>)}
            </ul>
          </section>

          <section>
            <h4 className="flex items-center gap-2 font-semibold text-sm mb-2"><Target className="h-4 w-4 text-primary" /> Study these</h4>
            <div className="flex flex-wrap gap-1.5">
              {prep.focusAreas?.map((f, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">{f}</span>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}