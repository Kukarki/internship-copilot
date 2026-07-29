"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

export function FetchJobsButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs/ingest", { method: "POST" });
      const data = await res.json();
      console.log("Ingest result:", data);
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <Button onClick={run} disabled={loading}>
      {loading ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching...</>
      ) : (
        <><RefreshCw className="mr-2 h-4 w-4" /> Fetch latest internships</>
      )}
    </Button>
  );
}
