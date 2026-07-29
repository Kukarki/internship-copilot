import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { chromium } from "playwright";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

export const runtime = "nodejs";
export const maxDuration = 120;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

function detectAts(u: string) {
  if (/greenhouse\.io|boards\.greenhouse/i.test(u)) return "greenhouse";
  if (/lever\.co/i.test(u)) return "lever";
  if (/ashbyhq\.com|jobs\.ashby/i.test(u)) return "ashby";
  if (/myworkdayjobs\.com|workday/i.test(u)) return "workday";
  if (/icims\.com/i.test(u)) return "icims";
  return "unknown";
}

const FIELDS: Record<string, Record<string, string[]>> = {
  greenhouse: {
    first: ["#first_name", "input[name='first_name']"],
    last: ["#last_name", "input[name='last_name']"],
    email: ["#email", "input[name='email']", "input[type='email']"],
    phone: ["#phone", "input[name='phone']", "input[type='tel']"],
  },
  lever: {
    name: ["input[name='name']"],
    email: ["input[name='email']", "input[type='email']"],
    phone: ["input[name='phone']", "input[type='tel']"],
  },
  ashby: {
    name: ["input[name*='name' i]"],
    email: ["input[type='email']"],
    phone: ["input[type='tel']"],
  },
  workday: {
    first: ["input[data-automation-id='legalNameSection_firstName']", "input[name*='firstName' i]"],
    last: ["input[data-automation-id='legalNameSection_lastName']", "input[name*='lastName' i]"],
    email: ["input[data-automation-id='email']", "input[type='email']"],
    phone: ["input[data-automation-id='phone-number']", "input[type='tel']"],
  },
  icims: {
    first: ["input[name*='firstname' i]", "input[id*='firstname' i]"],
    last: ["input[name*='lastname' i]", "input[id*='lastname' i]"],
    email: ["input[type='email']", "input[name*='email' i]"],
    phone: ["input[type='tel']", "input[name*='phone' i]"],
  },
};

async function fillSel(page: any, sels: string[] | undefined, val: string) {
  if (!val || !sels) return;
  for (const s of sels) {
    const el = page.locator(s).first();
    if (await el.count()) { try { await el.fill(val, { timeout: 2500 }); return; } catch {} }
  }
}

// AI fallback: read the page's inputs, ask Gemini which profile value each wants.
async function aiFill(page: any, profile: any) {
  const inputs = await page.evaluate(() => {
    const out: any[] = [];
    document.querySelectorAll("input, textarea").forEach((el: any, i) => {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (["hidden", "submit", "button", "checkbox", "radio", "file"].includes(type)) return;
      const labelText =
        (el.labels && el.labels[0]?.innerText) ||
        el.getAttribute("aria-label") ||
        el.getAttribute("placeholder") ||
        el.getAttribute("name") || "";
      out.push({ i, label: labelText.slice(0, 80), type });
    });
    return out.slice(0, 25);
  });
  if (inputs.length === 0) return 0;

  const prompt = `Map form fields to a candidate's data. For each field, return the exact value to type, or "" if none applies. Return ONLY JSON: an array of {"i": number, "value": string}.
Candidate: ${JSON.stringify({
    firstName: profile.firstName, lastName: profile.lastName, fullName: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
    email: profile.email, phone: profile.phone, linkedin: profile.linkedin, github: profile.github,
  })}
Fields: ${JSON.stringify(inputs)}`;

  let mapping: any[] = [];
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0, responseMimeType: "application/json" },
    });
    mapping = JSON.parse((res.text ?? "[]").replace(/^```json\n?|\n?```$/g, "").trim());
  } catch { return 0; }

  const handles = await page.locator("input, textarea").elementHandles();
  let filled = 0;
  for (const m of mapping) {
    if (!m.value) continue;
    const h = handles[m.i];
    if (h) { try { await h.fill(String(m.value), { timeout: 2000 }); filled++; } catch {} }
  }
  return filled;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await req.json();
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  let profile: any = {};
  try { profile = JSON.parse(fs.readFileSync("apply-profile.json", "utf8")); }
  catch { return NextResponse.json({ error: "apply-profile.json missing" }, { status: 400 }); }

  const ats = detectAts(job.url);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    try {
      const btn = page.getByRole("button", { name: /apply/i }).first();
      if (await btn.count()) { await btn.click({ timeout: 2500 }); await page.waitForTimeout(1500); }
    } catch {}

    let method = ats;
    const f = FIELDS[ats];
    if (f) {
      const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
      if (f.first) { await fillSel(page, f.first, profile.firstName); await fillSel(page, f.last, profile.lastName); }
      else { await fillSel(page, f.name, fullName); }
      await fillSel(page, f.email, profile.email);
      await fillSel(page, f.phone, profile.phone);
    } else {
      const n = await aiFill(page, profile);
      method = `ai-guess (${n} fields)`;
    }

    const shot = await page.screenshot({ fullPage: true });
    await browser.close();
    return NextResponse.json({ ats: method, url: job.url, screenshot: `data:image/png;base64,${shot.toString("base64")}` });
  } catch (e) {
    if (browser) await browser.close();
    console.error("Apply failed:", e);
    return NextResponse.json({ error: "Automation failed - apply manually", url: job.url }, { status: 200 });
  }
}