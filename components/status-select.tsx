"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = ["SAVED", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"] as const;
const LABEL: Record<string, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export function StatusSelect({ jobId, current }: { jobId: string; current: string }) {
  const [value, setValue] = useState(current || "SAVED");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function change(next: string) {
    setValue(next);
    setSaving(true);
    try {
      await fetch("/api/applications/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, status: next }),
      });
    } finally {
      setSaving(false);
      router.refresh();
    }
  }

  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value)}
      disabled={saving}
      className="text-xs border rounded px-2 py-1 bg-background"
    >
      {OPTIONS.map((o) => (
        <option key={o} value={o}>{LABEL[o]}</option>
      ))}
    </select>
  );
}