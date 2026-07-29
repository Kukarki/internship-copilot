import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import Link from "next/link";
import { FetchJobsButton } from "@/components/fetch-jobs-button";
import { ScoreJobsButton } from "@/components/score-jobs-button";
import { GenerateButton } from "@/components/generate-button";
import { ApplyButton } from "@/components/apply-button";
import { StatusSelect } from "@/components/status-select";
import { MapPin, Building2 } from "lucide-react";

const STATUSES = ["SAVED", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"] as const;
const LABEL: Record<string, string> = { SAVED: "Saved", APPLIED: "Applied", INTERVIEWING: "Interviewing", OFFER: "Offer", REJECTED: "Rejected" };

function fillable(url: string) {
  return /greenhouse\.io|boards\.greenhouse|lever\.co|ashbyhq\.com|jobs\.ashby|myworkdayjobs\.com|workday|icims\.com/i.test(url);
}
const NON_US = /\b(canada|toronto|vancouver|london|uk|united kingdom|ireland|dublin|germany|berlin|munich|france|paris|india|bangalore|bengaluru|hyderabad|singapore|australia|sydney|netherlands|amsterdam|spain|madrid|poland|warsaw|brazil|mexico|japan|tokyo|china|shanghai|israel|tel aviv|remote,? emea|remote,? apac|remote,? uk|remote,? canada)\b/i;
function isUS(loc: string) { return !loc || !NON_US.test(loc); }

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string; fillable?: string; us?: string }> }) {
  const { userId } = await auth();
  if (!userId) return <main className="max-w-5xl mx-auto px-4 py-16 text-center"><p className="text-muted-foreground">Sign in to see internships.</p></main>;

  const { status: filter, fillable: onlyFillable, us: onlyUS } = await searchParams;
  const user = await db.user.findUnique({ where: { clerkId: userId } });

  const all = await db.job.findMany({ where: { visaStatus: { not: "BLOCKED" } }, orderBy: { postedAt: "desc" }, take: 500 });
  const apps = user ? await db.application.findMany({ where: { userId: user.id } }) : [];
  const byJob = new Map(apps.map((a) => [a.jobId, a]));

  const counts: Record<string, number> = { SAVED: 0, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0 };
  for (const a of apps) if (a.status in counts) counts[a.status]++;
  const fillableCount = all.filter((j) => fillable(j.url)).length;
  const usCount = all.filter((j) => isUS(j.location)).length;

  let jobs = all.map((j) => ({ job: j, app: byJob.get(j.id) }))
    .sort((a, b) => {
      const sa = a.app?.matchScore ?? -1, sb = b.app?.matchScore ?? -1;
      if (sb !== sa) return sb - sa;
      return b.job.postedAt.getTime() - a.job.postedAt.getTime();
    });
  if (filter && STATUSES.includes(filter as any)) jobs = jobs.filter((x) => x.app?.status === filter);
  if (onlyFillable === "1") jobs = jobs.filter((x) => fillable(x.job.url));
  if (onlyUS === "1") jobs = jobs.filter((x) => isUS(x.job.location));
  jobs = jobs.slice(0, 150);

  const q = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (filter) p.set("status", filter);
    if (onlyFillable === "1") p.set("fillable", "1");
    if (onlyUS === "1") p.set("us", "1");
    for (const [k, v] of Object.entries(extra)) { if (v) p.set(k, v); else p.delete(k); }
    const s = p.toString(); return s ? `/jobs?${s}` : "/jobs";
  };

  function ring(score: number) {
    const c = score >= 75 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-muted-foreground";
    return (
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" className={`${c} stroke-current`} strokeWidth="3"
            strokeDasharray={`${(score / 100) * 97.4} 97.4`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-xs font-bold">{score}</span>
      </div>
    );
  }

  const pill = (key: string, href: string, label: string, active: boolean, tone = "default") => (
    <Link key={key} href={href} className={[
      "px-3 py-1.5 rounded-full text-sm border transition-colors",
      active
        ? tone === "blue" ? "bg-primary text-primary-foreground border-primary"
          : tone === "green" ? "bg-green-600 text-white border-green-600"
          : "bg-foreground text-background border-foreground"
        : "bg-card hover:bg-accent hover:text-accent-foreground",
    ].join(" ")}>{label}</Link>
  );

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Internships</h1>
          <p className="text-muted-foreground mt-1 text-sm">Ranked against your resume. Best matches first.</p>
        </div>
        <div className="flex gap-2"><ScoreJobsButton /><FetchJobsButton /></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {pill("all", q({ status: "" }), "All", !filter)}
        {STATUSES.map((s) => pill(s, q({ status: s }), `${LABEL[s]} ${counts[s]}`, filter === s))}
        <span className="self-center text-muted-foreground px-1">·</span>
        {pill("fill", q({ fillable: onlyFillable === "1" ? "" : "1" }), `Auto-fillable ${fillableCount}`, onlyFillable === "1", "blue")}
        {pill("us", q({ us: onlyUS === "1" ? "" : "1" }), `US only ${usCount}`, onlyUS === "1", "green")}
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No jobs match this filter.</div>
      ) : (
        <div className="space-y-3">
          {jobs.map(({ job: j, app }) => (
            <div key={j.id} className="group rounded-xl border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all">
              <div className="flex items-start gap-4">
                {app?.matchScore != null ? ring(app.matchScore) : (
                  <div className="h-12 w-12 shrink-0 rounded-full border border-dashed grid place-items-center text-[10px] text-muted-foreground">—</div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <a href={j.url} target="_blank" rel="noreferrer" className="font-semibold leading-tight hover:text-primary transition-colors">{j.title}</a>
                    <StatusSelect jobId={j.id} current={app?.status ?? "SAVED"} />
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{j.company}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location || "N/A"}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {j.visaStatus === "F1_FRIENDLY"
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-600/15 text-green-600 font-medium">F-1 / OPT ok</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Verify sponsorship</span>}
                    {fillable(j.url) && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Auto-fill</span>}
                    {j.isRemote && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">Remote</span>}
                  </div>

                  {app?.matchScore != null && (
                    <div className="text-sm space-y-1 mt-3">
                      {app.strengths.length > 0 && <p><span className="text-green-600 font-medium">Strengths:</span> <span className="text-muted-foreground">{app.strengths.join(", ")}</span></p>}
                      {app.missingSkills.length > 0 && <p><span className="text-red-500 font-medium">Missing:</span> <span className="text-muted-foreground">{app.missingSkills.join(", ")}</span></p>}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t space-y-2">
                    <GenerateButton jobId={j.id} />
                    <ApplyButton jobId={j.id} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}