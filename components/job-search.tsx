"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function JobSearch({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  const router = useRouter();
  const params = useSearchParams();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams(params.toString());
    if (q.trim()) p.set("q", q.trim()); else p.delete("q");
    router.push(`/jobs?${p.toString()}`);
  }

  return (
    <form onSubmit={submit} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search title, company, or location..."
        className="w-full pl-10 pr-24 py-2.5 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 grad-bg text-white text-sm font-medium px-4 py-1.5 rounded-lg">Search</button>
    </form>
  );
}