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

  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  const resume = user ? await db.resume.findFirst({ where: { userId: user.id, isActive: true }, orderBy: { createdAt: "desc" } }) : null;
  const skills: string[] = (resume?.extractedData as any)?.skills ?? [];

  const prompt = `You are an interview coach preparing a candidate for a specific internship.
Return ONLY valid JSON (no markdown, no backticks) in this exact shape:
{
  "technical": [{"q": string, "why": string}],
  "behavioral": [{"q": string, "tip": string}],
  "askThem": [string],
  "focusAreas": [string]
}
Rules:
- 5 technical questions likely for THIS role, drawn from the job description. "why" = one short line on what they are testing.
- 4 behavioral questions. "tip" = one short line on how to structure the answer (STAR).
- 3 smart questions the candidate should ask the interviewer.
- 3 focus areas to study, prioritizing gaps between the job and the candidate's skills.
- Be specific to this posting, not generic.

Candidate skills: ${skills.join(", ") || "not provided"}

Company: ${job.company}
Role: ${job.title}
Job description:
${job.description.slice(0, 2500)}`;

  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.4, responseMimeType: "application/json" },
    });
    const raw = (res.text ?? "").replace(/^```json\n?|\n?```$/g, "").trim();
    return NextResponse.json({ prep: JSON.parse(raw), job: { title: job.title, company: job.company } });
  } catch (e) {
    console.error("Prep failed:", e);
    return NextResponse.json({ error: "Generation failed (rate limit?)" }, { status: 500 });
  }
}