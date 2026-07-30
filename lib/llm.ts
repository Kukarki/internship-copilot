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

// ---- Match scoring (weighted rubric, intern-calibrated) ----
export const MatchSchema = z.object({
  matchScore: z.number(),
  missing: z.array(z.string()),
  strengths: z.array(z.string()),
});
export type MatchResult = z.infer<typeof MatchSchema>;

export type CandidateProfile = {
  skills: string[];
  roles: string[];
  education: string[];
  yearsOfExperience: number;
};

export async function scoreJobMatch(
  profile: CandidateProfile,
  jobTitle: string,
  jobDescription: string
): Promise<MatchResult> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: `You score how well a STUDENT INTERN CANDIDATE fits an internship posting.

SCORING RUBRIC - weight these, in this order:
1. Hard skills / technologies (50%) - how much of what the posting REQUIRES does the candidate have. Required items count far more than "preferred" or "nice to have".
2. Role / title alignment (20%) - does the candidate's background match this kind of role.
3. Education fit (15%) - degree field and level versus what is asked.
4. Other tools & keywords (15%) - adjacent tools, platforms, methods.

CALIBRATION - this is an INTERNSHIP, so:
- Do NOT penalize for lack of professional years of experience. Coursework and personal projects count as real experience.
- Ignore boilerplate in the posting: benefits, salary, company mission, EEO/diversity statements, legal notices. Score only against actual requirements and qualifications.
- Treat equivalent technologies as matches (e.g. Postgres counts toward SQL, React counts toward frontend, Node counts toward backend, Docker counts toward containers/DevOps).
- Count a skill as present if the candidate has it under a different name or a close variant.

SCORE ANCHORS:
- 85-100: has nearly all required skills, right field, strong fit.
- 70-84: has most required skills, a few gaps.
- 50-69: partial overlap, several required skills missing.
- 25-49: weak overlap, wrong specialization.
- 0-24: unrelated role.

Return ONLY valid JSON (no markdown, no backticks):
{ "matchScore": number 0-100, "missing": string[], "strengths": string[] }
- missing: up to 6 REQUIRED skills the posting wants that the candidate lacks.
- strengths: up to 6 of the candidate's own skills this posting values.
Never invent candidate skills beyond the list given.

CANDIDATE
Skills: ${profile.skills.join(", ") || "none listed"}
Roles: ${profile.roles.join(", ") || "student"}
Education: ${profile.education.join(", ") || "not listed"}

POSTING
Title: ${jobTitle}
Description:
${jobDescription.slice(0, 3000)}`,
    config: { temperature: 0, responseMimeType: "application/json" },
  });
  if (!res.text) throw new Error("Empty response from LLM");
  const cleaned = res.text.replace(/^```json\n?|\n?```$/g, "").trim();
  const parsed = MatchSchema.parse(JSON.parse(cleaned));
  parsed.matchScore = Math.max(0, Math.min(100, Math.round(parsed.matchScore)));
  return parsed;
}