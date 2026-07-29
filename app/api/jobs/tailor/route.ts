import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 120;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "No profile" }, { status: 400 });

  const resume = await db.resume.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!resume) return NextResponse.json({ error: "Upload a resume first" }, { status: 400 });

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const data: any = resume.extractedData ?? {};
  const name = user.name ?? "Candidate";

  const prompt = `You tailor a candidate's resume toward a specific internship.
STRICT RULES:
- Use ONLY the candidate data provided. NEVER invent skills, employers, degrees, or experience.
- You may reorder, rephrase, and emphasize what is already there to match the job - nothing more.
- Output clean plain text (no markdown symbols), ready to paste. Use clear section headers in CAPS.
- Order the SKILLS section so the ones this job values appear first.
- Keep it concise and professional.

CANDIDATE
Name: ${name}
Skills: ${(data.skills ?? []).join(", ")}
Roles: ${(data.roles ?? []).join(", ")}
Education: ${(data.education ?? []).join(", ")}

TARGET JOB
Company: ${job.company}
Role: ${job.title}
Description:
${job.description.slice(0, 2500)}

Write the tailored resume now.`;

  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.3 },
    });
    const tailored = (res.text ?? "").trim();

    await db.application.upsert({
      where: { userId_jobId: { userId: user.id, jobId: job.id } },
      update: { tailoredResumeUrl: tailored },
      create: { userId: user.id, jobId: job.id, status: "SAVED", tailoredResumeUrl: tailored },
    });

    return NextResponse.json({ tailored });
  } catch (e) {
    console.error("Tailor failed:", e);
    return NextResponse.json({ error: "Generation failed (rate limit?)" }, { status: 500 });
  }
}