import { chromium } from "playwright";
import fs from "fs";

const url = process.argv[2];
if (!url) {
  console.log("Usage: node scripts/apply-greenhouse.mjs <greenhouse-job-url>");
  process.exit(1);
}

const profile = JSON.parse(fs.readFileSync("apply-profile.json", "utf8"));

async function tryFill(page, selectors, value) {
  if (!value) return false;
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.count()) {
      try { await el.fill(value, { timeout: 3000 }); return true; } catch {}
    }
  }
  return false;
}

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
console.log("Opening:", url);
await page.goto(url, { waitUntil: "domcontentloaded" });

// Greenhouse often has an "Apply" button that reveals the form.
try {
  const applyBtn = page.getByRole("button", { name: /apply/i }).first();
  if (await applyBtn.count()) { await applyBtn.click({ timeout: 3000 }); await page.waitForTimeout(1500); }
} catch {}

await tryFill(page, ["#first_name", "input[name='first_name']", "input[autocomplete='given-name']"], profile.firstName);
await tryFill(page, ["#last_name", "input[name='last_name']", "input[autocomplete='family-name']"], profile.lastName);
await tryFill(page, ["#email", "input[name='email']", "input[type='email']"], profile.email);
await tryFill(page, ["#phone", "input[name='phone']", "input[type='tel']"], profile.phone);
await tryFill(page, ["input[name*='urls'][name*='LinkedIn' i]", "input[name*='linkedin' i]"], profile.linkedin);
await tryFill(page, ["input[name*='github' i]"], profile.github);

// Attach the resume file if there is a file input.
try {
  if (profile.resumePath && fs.existsSync(profile.resumePath)) {
    const fileInput = page.locator("input[type='file']").first();
    if (await fileInput.count()) { await fileInput.setInputFiles(profile.resumePath); console.log("Attached resume."); }
  }
} catch (e) { console.log("Resume attach skipped:", e.message); }

console.log("\n=== FILLED WHAT I COULD. ===");
console.log("Review the form, fill anything missing, and click SUBMIT yourself.");
console.log("If you see a captcha or login, that is your stop - handle it manually.");
console.log("Close the browser window when done.\n");

// Keep the browser open for you to review + submit. Do NOT auto-submit.
await page.waitForTimeout(10 * 60 * 1000); // 10 min, then auto-close
await browser.close();