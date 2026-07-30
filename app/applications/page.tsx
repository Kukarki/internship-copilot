import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import Link from "next/link";
import { StatusSelect } from "@/components/status-select";
import { Analytics } from "@/components/analytics";
import { Building2, MapPin, ExternalLink, Inbox } from "lucide-react";

const LABEL: Record<string,string> = { SAVED:"Saved",APPLIED:"Applied",INTERVIEWING:"Interviewing",OFFER:"Offer",REJECTED:"Rejected" };
const TONE: Record<string,string> = {
  OFFER:"bg-green-600/15 text-green-600",
  INTERVIEWING:"bg-primary/15 text-primary",
  APPLIED:"bg-blue-500/15 text-blue-500",
  SAVED:"bg-muted text-muted-foreground",
  REJECTED:"bg-red-500/15 text-red-500",
};

export default async function ApplicationsPage() {
  const { userId } = await auth();
  if (!userId) return <main className="max-w-5xl mx-auto px-4 py-16 text-center"><p className="text-muted-foreground">Sign in to see your applications.</p></main>;

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  const apps = user ? await db.application.findMany({
    where: { userId: user.id },
    include: { job: true },
    orderBy: { lastActionAt: "desc" },
  }) : [];

  const counts: Record<string,number> = { SAVED:0,APPLIED:0,INTERVIEWING:0,OFFER:0,REJECTED:0 };
  for (const a of apps) if (a.status in counts) counts[a.status]++;

  // Anything that reached at least "applied" stage.
  const submitted = counts.APPLIED + counts.INTERVIEWING + counts.OFFER + counts.REJECTED;
  const interviewRate = submitted ? Math.round(((counts.INTERVIEWING + counts.OFFER) / submitted) * 100) : 0;
  const offerRate = submitted ? Math.round((counts.OFFER / submitted) * 100) : 0;

  const scoredAll = apps.filter((a) => a.matchScore != null);
  const scoredApplied = scoredAll.filter((a) => a.status !== "SAVED");
  const avg = (arr: typeof scoredAll) => arr.length ? Math.round(arr.reduce((s, a) => s + (a.matchScore ?? 0), 0) / arr.length) : null;

  const funnel = [
    { label: "Saved", count: apps.length, tone: "bg-muted-foreground/40" },
    { label: "Applied", count: submitted, tone: "bg-blue-500" },
    { label: "Interviewing", count: counts.INTERVIEWING + counts.OFFER, tone: "bg-primary" },
    { label: "Offers", count: counts.OFFER, tone: "bg-green-600" },
  ];

  // Last 8 weeks of activity by lastActionAt.
  const weekly: { label: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date(Date.now() - i * 7 * 86400000);
    const start = new Date(end.getTime() - 7 * 86400000);
    const count = apps.filter((a) => a.lastActionAt >= start && a.lastActionAt < end).length;
    weekly.push({ label: i === 0 ? "now" : `${i}w`, count });
  }

  const withMaterials = apps.filter((a) => a.coverLetterText || a.tailoredResumeUrl).length;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My applications</h1>
        <p className="text-muted-foreground mt-1 text-sm">Pipeline, analytics, and everything you are tracking.</p>
      </div>

      {apps.length > 0 && (
        <Analytics
          funnel={funnel}
          interviewRate={interviewRate}
          offerRate={offerRate}
          avgAppliedScore={avg(scoredApplied)}
          avgAllScore={avg(scoredAll)}
          weekly={weekly}
          withMaterials={withMaterials}
          totalTracked={apps.length}
        />
      )}

      {apps.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Nothing tracked yet.</p>
          <Link href="/jobs" className="inline-block grad-bg text-white font-medium px-5 py-2.5 rounded-xl">Browse internships</Link>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm pt-2">All tracked ({apps.length})</h2>
          {apps.map((a) => (
            <div key={a.id} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={a.job.url} target="_blank" rel="noreferrer" className="font-semibold hover:text-primary transition-colors">{a.job.title}</a>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TONE[a.status]}`}>{LABEL[a.status]}</span>
                    {a.matchScore != null && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">{a.matchScore}% match</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5"/>{a.job.company}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/>{a.job.location || "N/A"}</span>
                  </div>
                  {(a.coverLetterText || a.tailoredResumeUrl) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {a.coverLetterText ? "Cover letter" : ""}{a.coverLetterText && a.tailoredResumeUrl ? " + " : ""}{a.tailoredResumeUrl ? "Tailored resume" : ""} generated
                    </p>
                  )}
                </div>
                <StatusSelect jobId={a.jobId} current={a.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}