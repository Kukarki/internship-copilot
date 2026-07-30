"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteJobButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function run() {
    setLoading(true);
    try {
      await fetch("/api/jobs/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
    } finally { setLoading(false); router.refresh(); }
  }
  return (
    <button onClick={run} disabled={loading} title="Remove this job"
      className="grid place-items-center h-8 w-8 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}