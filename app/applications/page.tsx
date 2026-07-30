import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import Link from "next/link";
import { StatusSelect } from "@/components/status-select";
import { Building2, MapPin, ExternalLink, Inbox } from "lucide-react";

const ORDER = ["OFFER","INTERVIEWING","APPLIED","SAVED","REJECTED"] as const;
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

  const responseRate = counts.APPLIED + counts.INTERVIEWING + counts.OFFER + counts.REJECTED > 0
    ? Math.round(((counts.INTERVIEWING + counts.OFFER) / Math.max(1, counts.APPLIED + counts.INTERVIEWING + counts.OFFER + counts.REJECTED)) * 100)
    : 0;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My applications</h1>
        <p className="text-muted-foreground mt-1 text-sm">Everything you are tracking, newest activity first.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ORDER.map((s) => (
          <div key={s} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{LABEL[s]}</p>
            <p className="text-2xl font-bold mt-1">{counts[s]}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl grad-border p-5">
        <p className="text-sm text-muted-foreground">Interview rate</p>
        <p className="text-3xl font-bold grad-text mt-1">{responseRate}%</p>
        <p className="text-xs text-muted-foreground mt-1">Interviews + offers, out of everything you have applied to.</p>
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Nothing tracked yet.</p>
          <Link href="/jobs" className="inline-block grad-bg text-white font-medium px-5 py-2.5 rounded-xl">Browse internships</Link>
        </div>
      ) : (
        <div className="space-y-3">
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
                  {a.coverLetterText && <p className="text-xs text-muted-foreground mt-2">Cover letter generated</p>}
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