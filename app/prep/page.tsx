import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import Link from "next/link";
import { PrepPanel } from "@/components/prep-panel";
import { GraduationCap } from "lucide-react";

export default async function PrepPage() {
  const { userId } = await auth();
  if (!userId) return <main className="max-w-5xl mx-auto px-4 py-16 text-center"><p className="text-muted-foreground">Sign in to prep for interviews.</p></main>;

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  const apps = user ? await db.application.findMany({
    where: { userId: user.id, status: { in: ["APPLIED", "INTERVIEWING", "SAVED"] } },
    include: { job: true },
    orderBy: { lastActionAt: "desc" },
    take: 40,
  }) : [];

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Interview prep</h1>
        <p className="text-muted-foreground mt-1 text-sm">Questions generated from a specific job description and your resume.</p>
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Save or apply to a job first, then prep for it here.</p>
          <Link href="/jobs" className="inline-block grad-bg text-white font-medium px-5 py-2.5 rounded-xl">Browse internships</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold">{a.job.title}</p>
                  <p className="text-sm text-muted-foreground">{a.job.company}</p>
                </div>
                <PrepPanel jobId={a.jobId} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}