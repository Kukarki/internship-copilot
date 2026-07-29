import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { fetchAllJobs } from "@/lib/jobs-sources";
import { regexVisa } from "@/lib/visa";
import { classifyVisaLLM } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 300;

const LLM_CAP = 40; // max Gemini visa calls per run

// Map our stored VisaStatus enum from the richer LLM class.
function toStatus(v: string): "F1_FRIENDLY" | "BLOCKED" | "UNKNOWN" {
  if (v === "F1_OPT_OK") return "F1_FRIENDLY";
  if (v === "NO_SPONSORSHIP" || v === "CITIZEN_ONLY") return "BLOCKED";
  return "UNKNOWN";
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobs, report } = await fetchAllJobs();
  let saved = 0;
  let llmUsed = 0;
  const counts = { F1_FRIENDLY: 0, BLOCKED: 0, UNKNOWN: 0 };

  for (const j of jobs) {
    let status: "F1_FRIENDLY" | "BLOCKED" | "UNKNOWN" = "UNKNOWN";
    const quick = regexVisa(j.description);

    if (quick === "F1_FRIENDLY" || quick === "BLOCKED") {
      status = quick;
    } else if (llmUsed < LLM_CAP) {
      status = toStatus(await classifyVisaLLM(j.description));
      llmUsed++;
    } else {
      status = "UNKNOWN";
    }
    counts[status]++;

    try {
      await db.job.upsert({
        where: { source_externalId: { source: j.source, externalId: j.externalId } },
        update: {
          title: j.title, company: j.company, location: j.location, isRemote: j.isRemote,
          url: j.url, description: j.description, postedAt: j.postedAt, visaStatus: status,
        },
        create: {
          source: j.source, externalId: j.externalId, title: j.title, company: j.company,
          location: j.location, isRemote: j.isRemote, url: j.url, description: j.description,
          postedAt: j.postedAt, visaStatus: status,
        },
      });
      saved++;
    } catch (e) {
      console.error("Job upsert skipped:", j.company, j.title, e instanceof Error ? e.message : e);
    }
  }

  console.log("Ingest report:", report.join(" | "));
  console.log("Visa counts:", counts, "| LLM calls:", llmUsed);
  return NextResponse.json({ saved, total: jobs.length, counts, llmUsed, report });
}