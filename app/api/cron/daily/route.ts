import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchAllJobs } from "@/lib/jobs-sources";
import { regexVisa } from "@/lib/visa";
import { classifyVisaLLM } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 300;

const LLM_CAP = 25;

function toStatus(v: string): "F1_FRIENDLY" | "BLOCKED" | "UNKNOWN" {
  if (v === "F1_OPT_OK") return "F1_FRIENDLY";
  if (v === "NO_SPONSORSHIP" || v === "CITIZEN_ONLY") return "BLOCKED";
  return "UNKNOWN";
}

async function sendDigest(to: string, jobs: { title: string; company: string; location: string; url: string }[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key || jobs.length === 0) return false;

  const rows = jobs.slice(0, 15).map((j) =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #eee">
      <a href="${j.url}" style="color:#7c3aed;font-weight:600;text-decoration:none">${j.title}</a>
      <div style="color:#666;font-size:13px">${j.company} - ${j.location || "N/A"}</div>
    </td></tr>`).join("");

  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px">
    <h2 style="margin-bottom:4px">${jobs.length} new internship${jobs.length === 1 ? "" : "s"}</h2>
    <p style="color:#666;font-size:14px;margin-top:0">F-1 / OPT friendly roles added in the last day.</p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "onboarding@resend.dev",
      to,
      subject: `${jobs.length} new internship${jobs.length === 1 ? "" : "s"} for you`,
      html,
    }),
  });
  if (!res.ok) console.error("Resend failed:", await res.text());
  return res.ok;
}

export async function GET(req: Request) {
  // Cron auth: Vercel sends the CRON_SECRET as a bearer token.
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { jobs, report } = await fetchAllJobs();
  const seenUrls: string[] = [];
  let created = 0, llmUsed = 0;

  for (const j of jobs) {
    let status: "F1_FRIENDLY" | "BLOCKED" | "UNKNOWN" = "UNKNOWN";
    const quick = regexVisa(j.description);
    if (quick === "F1_FRIENDLY" || quick === "BLOCKED") status = quick;
    else if (llmUsed < LLM_CAP) { status = toStatus(await classifyVisaLLM(j.description)); llmUsed++; }

    try {
      const existing = await db.job.findUnique({
        where: { source_externalId: { source: j.source, externalId: j.externalId } },
        select: { id: true },
      });
      await db.job.upsert({
        where: { source_externalId: { source: j.source, externalId: j.externalId } },
        update: { title: j.title, company: j.company, location: j.location, isRemote: j.isRemote, url: j.url, description: j.description, postedAt: j.postedAt, deadline: j.deadline, visaStatus: status, isActive: true, lastSeenAt: new Date() },
        create: { source: j.source, externalId: j.externalId, title: j.title, company: j.company, location: j.location, isRemote: j.isRemote, url: j.url, description: j.description, postedAt: j.postedAt, deadline: j.deadline, visaStatus: status, isActive: true, lastSeenAt: new Date() },
      });
      if (!existing) created++;
      seenUrls.push(j.url);
    } catch { /* skip bad row */ }
  }

  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const deactivated = await db.job.updateMany({
    where: { OR: [
      { url: { notIn: seenUrls }, lastSeenAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
      { postedAt: { lt: cutoff } },
      { deadline: { not: null, lt: new Date() } },
    ] },
    data: { isActive: false },
  });

  // Digest: new F-1 friendly jobs from the last day.
  const fresh = await db.job.findMany({
    where: { createdAt: { gte: since }, isActive: true, visaStatus: "F1_FRIENDLY" },
    orderBy: { postedAt: "desc" },
    take: 15,
    select: { title: true, company: true, location: true, url: true },
  });

  let emailed = 0;
  if (fresh.length > 0) {
    const users = await db.user.findMany({ select: { email: true } });
    for (const u of users) {
      if (u.email && await sendDigest(u.email, fresh)) emailed++;
    }
  }

  console.log("Cron:", report.join(" | "));
  return NextResponse.json({ created, deactivated: deactivated.count, digest: fresh.length, emailed });
}