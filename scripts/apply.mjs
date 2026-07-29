import { chromium } from "playwright";
import fs from "fs";

const url = process.argv[2];
if (!url || url.includes("PASTE_")) {
  console.log("Usage: node scripts/apply.mjs <job-application-url>");
  process.exit(1);
}

const profile = JSON.parse(fs.readFileSync("apply-profile.json", "utf8"));

// Detect which ATS from the URL.
function detectAts(u) {
  if (/greenhouse\.io|boards\.greenhouse/i.test(u)) return "greenhouse";
  if (/lever\.co/i.test(u)) return "lever";
  if (/ashbyhq\.com|jobs\.ashby/i.test(u)) return "ashby";
  return "unknown";
}

// Field selectors per ATS. Each entry is a list of things to try.
const FIELDS = {
  greenhouse: {
    firstName: ["#first_name", "input[name='first_name']", "input[autocomplete='given-name']"],
    lastName: ["#last_name", "input[name='last_name']", "input[autocomplete='family-name']"],
    email: ["#email", "input[name='email']", "input[type='email']"],
    phone: ["#phone", "input[name='phone']", "input[type='tel']"],
    linkedin: ["input[name*='linkedin' i]", "input[name*='urls'][name*='LinkedIn' i]"],
    github: ["input[name*='github' i]"],
  },
  lever: {
    firstName: ["input[name='name']"],
    lastName: [],
    email: ["input[name='email']", "input[type='email']"],
    phone: ["input[name='phone']", "input[type='tel']"],
    linkedin: ["input[name*='urls[LinkedIn]' i]", "input[name*='linkedin' i]"],
    github: ["input[name*='urls[GitHub]' i]", "input[name*='github' i]"],
  },
  ashby: {
    firstName: ["input[name*='name' i]", "input[placeholder*='name' i]"],
    lastName: [],
    email: ["input[type='email']", "input[name*='email' i]"],
    phone: ["input[type='tel']", "input[name*='phone' i]"],
    linkedin: ["input[name*='linkedin' i]"],
    github: ["input[name*='github' i]"],
  },
};

async function tryFill(page, selectors, value) {
  if (!value || !selectors || selectors.length === 0) return false;
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.count()) {
      try { await el.fill(value, { timeout: 3000 }); return true; } catch {}
    }
  }
  return false;
}

const ats = detectAts(url);
console.log("Detected ATS:", ats);
if (ats === "unknown") {
  console.log("This URL is not Greenhouse, Lever, or Ashby - I can only assist those.");
  console.log("Opening it anyway so you can apply manually.");
}

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
console.log("Opening:", url);
await page.goto(url, { waitUntil: "domcontentloaded" });

// Reveal the form if there is an Apply button.
try {
  const applyBtn = page.getByRole("button", { name: /apply/i }).first();
  if (await applyBtn.count()) { await applyBtn.click({ timeout: 3000 }); await page.waitForTimeout(1500); }
} catch {}
try {
  const applyLink = page.getByRole("link", { name: /apply/i }).first();
  if (await applyLink.count()) { await applyLink.click({ timeout: 3000 }); await page.waitForTimeout(1500); }
} catch {}

const f = FIELDS[ats];
if (f) {
  // Lever/Ashby use one "name" field; send the full name there.
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  if (ats === "greenhouse") {
    await tryFill(page, f.firstName, profile.firstName);
    await tryFill(page, f.lastName, profile.lastName);
  } else {
    await tryFill(page, f.firstName, fullName);
  }
  await tryFill(page, f.email, profile.email);
  await tryFill(page, f.phone, profile.phone);
  await tryFill(page, f.linkedin, profile.linkedin);
  await tryFill(page, f.github, profile.github);

  try {
    if (profile.resumePath && fs.existsSync(profile.resumePath)) {
      const fileInput = page.locator("input[type='file']").first();
      if (await fileInput.count()) { await fileInput.setInputFiles(profile.resumePath); console.log("Attached resume."); }
    }
  } catch (e) { console.log("Resume attach skipped:", e.message); }
}

console.log("\n=== FILLED WHAT I COULD (" + ats + ") ===");
console.log("Review the form, complete anything missing, and click SUBMIT yourself.");
console.log("Captcha or login = your stop, handle it manually.");
console.log("Close the window when done.\n");

await page.waitForTimeout(10 * 60 * 1000);
await browser.close();