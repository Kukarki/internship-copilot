import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fetchAllJobs } from "@/lib/jobs-sources";
import { regexVisa } from "@/lib/visa";
import { classifyVisaLLM } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 300;
const LLM_CAP = 40;

function toStatus(v: string): "F1_FRIENDLY" | "BLOCKED" | "UNKNOWN" {
  if (v === "F1_OPT_OK") return "F1_FRIENDLY";
  if (v === "NO_SPONSORSHIP" || v === "CITIZEN_ONLY") return "BLOCKED";
  return "UNKNOWN";
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobs, report } = await fetchAllJobs();
  const seenUrls: string[] = [];
  let saved = 0, llmUsed = 0;

  for (const j of jobs) {
    let status: "F1_FRIENDLY" | "BLOCKED" | "UNKNOWN" = "UNKNOWN";
    const quick = regexVisa(j.description);
    if (quick === "F1_FRIENDLY" || quick === "BLOCKED") status = quick;
    else if (llmUsed < LLM_CAP) { status = toStatus(await classifyVisaLLM(j.description)); llmUsed++; }

    try {
      await db.job.upsert({
        where: { source_externalId: { source: j.source, externalId: j.externalId } },
        update: { title: j.title, company: j.company, location: j.location, isRemote: j.isRemote, url: j.url, description: j.description, postedAt: j.postedAt, deadline: j.deadline, visaStatus: status, isActive: true, lastSeenAt: new Date() },
        create: { source: j.source, externalId: j.externalId, title: j.title, company: j.company, location: j.location, isRemote: j.isRemote, url: j.url, description: j.description, postedAt: j.postedAt, deadline: j.deadline, visaStatus: status, isActive: true, lastSeenAt: new Date() },
      });
      seenUrls.push(j.url);
      saved++;
    } catch (e) { console.error("skip:", j.company, j.title); }
  }

  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const deactivated = await db.job.updateMany({
    where: { OR: [
      { url: { notIn: seenUrls }, lastSeenAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
      { postedAt: { lt: cutoff } },
      { deadline: { not: null, lt: now } },
    ] },
    data: { isActive: false },
  });

  console.log("Ingest report:", report.join(" | "));
  console.log(`Saved ${saved}, deactivated ${deactivated.count}`);
  return NextResponse.json({ saved, deactivated: deactivated.count, report });
}