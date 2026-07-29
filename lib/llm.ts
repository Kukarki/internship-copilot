import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = "gemini-2.5-flash";

export const ResumeExtractionSchema = z.object({
  skills: z.array(z.string()),
  roles: z.array(z.string()),
  education: z.array(z.string()),
  yearsOfExperience: z.number(),
});
export type ResumeExtraction = z.infer<typeof ResumeExtractionSchema>;

function parseResume(raw: string): ResumeExtraction {
  const cleaned = raw.replace(/^```json\n?|\n?```$/g, "").trim();
  return ResumeExtractionSchema.parse(JSON.parse(cleaned));
}

const PROMPT = `You are a strict resume parser. Read the attached resume and extract the requested fields.
RULES:
1. Return ONLY valid JSON - no markdown, no backticks, no commentary.
2. Do not invent skills, roles, or experience not present in the document.
3. If a field is absent, return an empty array (or 0 for yearsOfExperience).
Return this exact shape:
{ "skills": string[], "roles": string[], "education": string[], "yearsOfExperience": number }`;

export async function extractResumeFromText(text: string): Promise<ResumeExtraction> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: `${PROMPT}\n\nResume Text:\n${text}`,
    config: { temperature: 0, responseMimeType: "application/json" },
  });
  if (!res.text) throw new Error("Empty response from LLM");
  return parseResume(res.text);
}

export async function extractResumeFromFile(base64: string, mimeType: string): Promise<ResumeExtraction> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [{ inlineData: { data: base64, mimeType } }, { text: PROMPT }],
    config: { temperature: 0, responseMimeType: "application/json" },
  });
  if (!res.text) throw new Error("Empty response from LLM");
  return parseResume(res.text);
}

export type VisaClass = "F1_OPT_OK" | "NO_SPONSORSHIP" | "CITIZEN_ONLY" | "UNCLEAR";

export async function classifyVisaLLM(description: string): Promise<VisaClass> {
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: `You classify a job posting for an international F-1 student on OPT/CPT who will need sponsorship later. Reply with ONLY one token:
F1_OPT_OK - explicitly allows F-1/OPT/CPT/STEM-OPT, sponsors visas, or welcomes international students.
NO_SPONSORSHIP - will NOT sponsor, or "must be authorized to work without sponsorship".
CITIZEN_ONLY - requires US citizenship, green card, permanent resident, clearance, ITAR, or "US Person".
UNCLEAR - does not clearly state.
Return exactly one of: F1_OPT_OK, NO_SPONSORSHIP, CITIZEN_ONLY, UNCLEAR.

Job posting:
${description.slice(0, 3500)}`,
      config: { temperature: 0 },
    });
    const out = (res.text ?? "").toUpperCase();
    if (out.includes("F1_OPT_OK")) return "F1_OPT_OK";
    if (out.includes("NO_SPONSORSHIP")) return "NO_SPONSORSHIP";
    if (out.includes("CITIZEN_ONLY")) return "CITIZEN_ONLY";
    return "UNCLEAR";
  } catch {
    return "UNCLEAR";
  }
}

// ---- Match scoring ----
export const MatchSchema = z.object({
  matchScore: z.number(),
  missing: z.array(z.string()),
  strengths: z.array(z.string()),
});
export type MatchResult = z.infer<typeof MatchSchema>;

export async function scoreJobMatch(
  resumeSkills: string[],
  jobTitle: string,
  jobDescription: string
): Promise<MatchResult> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: `You score how well a candidate fits a job, based ONLY on the skills provided.
Return ONLY valid JSON (no markdown, no backticks) in this exact shape:
{ "matchScore": number 0-100, "missing": string[], "strengths": string[] }
- matchScore: how well the candidate's skills cover this job.
- missing: up to 6 important skills the job wants that the candidate does NOT have.
- strengths: up to 6 of the candidate's skills that this job values.
Do not invent candidate skills beyond the list given.

Candidate skills: ${resumeSkills.join(", ")}

Job title: ${jobTitle}
Job description:
${jobDescription.slice(0, 3000)}`,
    config: { temperature: 0, responseMimeType: "application/json" },
  });
  if (!res.text) throw new Error("Empty response from LLM");
  const cleaned = res.text.replace(/^```json\n?|\n?```$/g, "").trim();
  const parsed = MatchSchema.parse(JSON.parse(cleaned));
  parsed.matchScore = Math.max(0, Math.min(100, Math.round(parsed.matchScore)));
  return parsed;
}