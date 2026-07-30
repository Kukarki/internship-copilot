import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { scoreJobMatch } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH = 12;
const DELAY_MS = 4500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const NON_US = /\b(canada|toronto|vancouver|mexico|london|uk|united kingdom|ireland|dublin|germany|berlin|france|paris|india|bangalore|bengaluru|hyderabad|singapore|australia|sydney|netherlands|amsterdam|spain|madrid|poland|brazil|japan|tokyo|china|shanghai|israel|remote,? emea|remote,? apac|remote,? uk|remote,? canada)\b/i;
const isUS = (l: string) => !l || !NON_US.test(l);

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "No profile yet" }, { status: 400 });

  const resume = await db.resume.findFirst({ where: { userId: user.id, isActive: true }, orderBy: { createdAt: "desc" } });
  if (!resume) return NextResponse.json({ error: "Upload a resume first" }, { status: 400 });

  const d: any = resume.extractedData ?? {};
  const profile = {
    skills: d.skills ?? [],
    roles: d.roles ?? [],
    education: d.education ?? [],
    yearsOfExperience: d.yearsOfExperience ?? 0,
  };
  if (profile.skills.length === 0) return NextResponse.json({ error: "No skills on your resume" }, { status: 400 });

  const scored = await db.application.findMany({ where: { userId: user.id, matchScore: { not: null } }, select: { jobId: true } });
  const scoredIds = new Set(scored.map((s) => s.jobId));

  const candidates = await db.job.findMany({
    where: { visaStatus: { not: "BLOCKED" }, isActive: true, id: { notIn: [...scoredIds] } },
    orderBy: { postedAt: "desc" },
    take: 60,
  });
  const jobs = candidates.filter((j) => isUS(j.location)).slice(0, BATCH);

  let done = 0, rateLimited = false;
  for (const job of jobs) {
    let ok = false;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        const m = await scoreJobMatch(profile, job.title, job.description);
        await db.application.upsert({
          where: { userId_jobId: { userId: user.id, jobId: job.id } },
          update: { matchScore: m.matchScore, missingSkills: m.missing, strengths: m.strengths },
          create: { userId: user.id, jobId: job.id, status: "SAVED", matchScore: m.matchScore, missingSkills: m.missing, strengths: m.strengths },
        });
        done++; ok = true;
        await sleep(DELAY_MS);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/429|rate|quota|resource/i.test(msg)) {
          if (attempt === 0) { await sleep(12000); continue; }
          rateLimited = true;
        }
        break;
      }
    }
    if (rateLimited) break;
  }

  const remaining = await db.job.count({ where: { visaStatus: { not: "BLOCKED" }, isActive: true, id: { notIn: [...scoredIds] } } }) - done;
  return NextResponse.json({ scored: done, remaining: Math.max(0, remaining), rateLimited });
}