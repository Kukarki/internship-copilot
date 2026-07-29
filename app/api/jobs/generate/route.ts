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
  const skills = (data.skills ?? []).join(", ");
  const name = user.name ?? "the candidate";

  const prompt = `You write a tailored cover letter for an internship applicant.
STRICT RULES:
- Use ONLY the skills and background provided. Do NOT invent experience, companies, or skills.
- Keep it to 3 short paragraphs, professional and specific to this job.
- No placeholders like [Your Name] - use the details given or omit gracefully.

Applicant name: ${name}
Applicant skills: ${skills}

Company: ${job.company}
Role: ${job.title}
Job description:
${job.description.slice(0, 2500)}

Write the cover letter now.`;

  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.4 },
    });
    const coverLetter = (res.text ?? "").trim();

    await db.application.upsert({
      where: { userId_jobId: { userId: user.id, jobId: job.id } },
      update: { coverLetterText: coverLetter },
      create: { userId: user.id, jobId: job.id, status: "SAVED", coverLetterText: coverLetter },
    });

    return NextResponse.json({ coverLetter });
  } catch (e) {
    console.error("Generate failed:", e);
    return NextResponse.json({ error: "Generation failed (rate limit?)" }, { status: 500 });
  }
}