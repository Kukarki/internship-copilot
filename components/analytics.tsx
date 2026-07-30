"use client";

import { TrendingUp, Target, Award, FileText } from "lucide-react";

type Point = { label: string; count: number };

export function Analytics({
  funnel,
  interviewRate,
  offerRate,
  avgAppliedScore,
  avgAllScore,
  weekly,
  withMaterials,
  totalTracked,
}: {
  funnel: { label: string; count: number; tone: string }[];
  interviewRate: number;
  offerRate: number;
  avgAppliedScore: number | null;
  avgAllScore: number | null;
  weekly: Point[];
  withMaterials: number;
  totalTracked: number;
}) {
  const maxWeek = Math.max(1, ...weekly.map((w) => w.count));
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));

  const stats = [
    { icon: TrendingUp, label: "Interview rate", value: `${interviewRate}%`, hint: "of applications" },
    { icon: Award, label: "Offer rate", value: `${offerRate}%`, hint: "of applications" },
    { icon: Target, label: "Avg match applied", value: avgAppliedScore != null ? `${avgAppliedScore}%` : "-", hint: avgAllScore != null ? `vs ${avgAllScore}% overall` : "no scores yet" },
    { icon: FileText, label: "With materials", value: `${withMaterials}`, hint: `of ${totalTracked} tracked` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-1 grad-text">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold text-sm mb-4">Pipeline funnel</h3>
          <div className="space-y-2.5">
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-semibold">{f.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${f.tone}`} style={{ width: `${(f.count / maxFunnel) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold text-sm mb-4">Activity, last 8 weeks</h3>
          {weekly.every((w) => w.count === 0) ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {weekly.map((w) => (
                <div key={w.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{w.count || ""}</span>
                  <div className="w-full grad-bg rounded-t-md transition-all"
                    style={{ height: `${Math.max(4, (w.count / maxWeek) * 100)}%` }} />
                  <span className="text-[10px] text-muted-foreground">{w.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}