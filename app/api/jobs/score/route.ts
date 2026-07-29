import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { scoreJobMatch } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH = 20; // jobs scored per run (free-tier friendly)

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "No profile yet" }, { status: 400 });

  const resume = await db.resume.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!resume) return NextResponse.json({ error: "Upload a resume first" }, { status: 400 });

  const skills: string[] = (resume.extractedData as any)?.skills ?? [];
  if (skills.length === 0) {
    return NextResponse.json({ error: "No skills found on your resume" }, { status: 400 });
  }

  // Jobs not yet scored for this user (no Application row with a matchScore).
  const scored = await db.application.findMany({
    where: { userId: user.id, matchScore: { not: null } },
    select: { jobId: true },
  });
  const scoredIds = new Set(scored.map((s) => s.jobId));

  const jobs = await db.job.findMany({
    where: { visaStatus: { not: "BLOCKED" }, id: { notIn: [...scoredIds] } },
    orderBy: { postedAt: "desc" },
    take: BATCH,
  });

  let done = 0;
  for (const job of jobs) {
    try {
      const m = await scoreJobMatch(skills, job.title, job.description);
      await db.application.upsert({
        where: { userId_jobId: { userId: user.id, jobId: job.id } },
        update: { matchScore: m.matchScore, missingSkills: m.missing, strengths: m.strengths },
        create: {
          userId: user.id, jobId: job.id, status: "SAVED",
          matchScore: m.matchScore, missingSkills: m.missing, strengths: m.strengths,
        },
      });
      done++;
    } catch (e) {
      console.error("Score skipped:", job.title, e instanceof Error ? e.message : e);
    }
  }

  const remaining = await db.job.count({
    where: { visaStatus: { not: "BLOCKED" }, id: { notIn: [...scoredIds, ...jobs.map((j) => j.id)] } },
  });

  console.log(`Scored ${done} jobs, ${remaining} remaining`);
  return NextResponse.json({ scored: done, remaining });
}