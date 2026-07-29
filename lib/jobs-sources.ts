export type NormalizedJob = {
  source: "GREENHOUSE" | "LEVER" | "ADZUNA";
  externalId: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  url: string;
  description: string;
  postedAt: Date;
};

export const COMPANIES: { source: "GREENHOUSE" | "LEVER"; token: string; name: string }[] = [
  { source: "GREENHOUSE", token: "stripe", name: "Stripe" },
  { source: "GREENHOUSE", token: "airbnb", name: "Airbnb" },
  { source: "GREENHOUSE", token: "anthropic", name: "Anthropic" },
  { source: "GREENHOUSE", token: "notion", name: "Notion" },
  { source: "GREENHOUSE", token: "databricks", name: "Databricks" },
  { source: "GREENHOUSE", token: "figma", name: "Figma" },
  { source: "GREENHOUSE", token: "gitlab", name: "GitLab" },
  { source: "GREENHOUSE", token: "robinhood", name: "Robinhood" },
  { source: "GREENHOUSE", token: "coinbase", name: "Coinbase" },
  { source: "GREENHOUSE", token: "dropbox", name: "Dropbox" },
  { source: "GREENHOUSE", token: "reddit", name: "Reddit" },
  { source: "GREENHOUSE", token: "discord", name: "Discord" },
  { source: "GREENHOUSE", token: "plaid", name: "Plaid" },
  { source: "GREENHOUSE", token: "brex", name: "Brex" },
  { source: "GREENHOUSE", token: "ramp", name: "Ramp" },
  { source: "GREENHOUSE", token: "retool", name: "Retool" },
  { source: "GREENHOUSE", token: "benchling", name: "Benchling" },
  { source: "GREENHOUSE", token: "samsara", name: "Samsara" },
  { source: "GREENHOUSE", token: "doordash", name: "DoorDash" },
  { source: "GREENHOUSE", token: "instacart", name: "Instacart" },
  { source: "GREENHOUSE", token: "affirm", name: "Affirm" },
  { source: "GREENHOUSE", token: "cloudflare", name: "Cloudflare" },
  { source: "GREENHOUSE", token: "gusto", name: "Gusto" },
  { source: "GREENHOUSE", token: "asana", name: "Asana" },
  { source: "GREENHOUSE", token: "twitch", name: "Twitch" },
  { source: "GREENHOUSE", token: "pinterest", name: "Pinterest" },
  { source: "GREENHOUSE", token: "lyft", name: "Lyft" },
  { source: "GREENHOUSE", token: "flexport", name: "Flexport" },
  { source: "GREENHOUSE", token: "wealthfront", name: "Wealthfront" },
  { source: "GREENHOUSE", token: "airtable", name: "Airtable" },
  { source: "GREENHOUSE", token: "chime", name: "Chime" },
  { source: "GREENHOUSE", token: "gemini", name: "Gemini" },
  { source: "GREENHOUSE", token: "circle", name: "Circle" },
  { source: "GREENHOUSE", token: "sofi", name: "SoFi" },
  { source: "GREENHOUSE", token: "opendoor", name: "Opendoor" },
  { source: "GREENHOUSE", token: "verkada", name: "Verkada" },
  { source: "GREENHOUSE", token: "scaleai", name: "Scale AI" },
  { source: "GREENHOUSE", token: "faire", name: "Faire" },
  { source: "GREENHOUSE", token: "webflow", name: "Webflow" },
  { source: "GREENHOUSE", token: "vercel", name: "Vercel" },
  { source: "LEVER", token: "netflix", name: "Netflix" },
  { source: "LEVER", token: "palantir", name: "Palantir" },
  { source: "LEVER", token: "kayak", name: "KAYAK" },
  { source: "LEVER", token: "attentive", name: "Attentive" },
  { source: "LEVER", token: "voleon", name: "Voleon" },
  { source: "LEVER", token: "fanatics", name: "Fanatics" },
  { source: "LEVER", token: "gopuff", name: "Gopuff" },
];

const INTERN_RE = /intern|co-?op|new ?grad|university|early career|apprentic/i;

const TECH_RE = /software|engineer|developer|data|machine learning|\bml\b|\bai\b|backend|back-end|frontend|front-end|full[- ]?stack|devops|security|cloud|infrastructure|platform|mobile|ios|android|web|computer|programming|sde|swe|qa|test|analytics|systems/i;

const NON_TECH_RE = /nurse|nursing|clinical|audit|accounting|sales|marketing|recruit|teacher|barista|driver|warehouse|retail|hospitality|physician|therapist|pharmac|legal|paralegal|hr\b|human resources|social work|dental|veterinar/i;

function isTechRole(title: string, description: string): boolean {
  if (NON_TECH_RE.test(title)) return false;
  return TECH_RE.test(title) || TECH_RE.test(description.slice(0, 600));
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchGreenhouse(token: string, name: string): Promise<NormalizedJob[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`);
  if (!res.ok) throw new Error(`Greenhouse ${token}: ${res.status}`);
  const data = await res.json();
  return (data.jobs ?? [])
    .filter((j: any) => INTERN_RE.test(j.title ?? ""))
    .map((j: any) => {
      const loc = j.location?.name ?? "";
      return {
        source: "GREENHOUSE" as const,
        externalId: String(j.id),
        title: j.title,
        company: name,
        location: loc,
        isRemote: /remote/i.test(loc),
        url: j.absolute_url,
        description: stripHtml(j.content ?? "").slice(0, 4000),
        postedAt: new Date(j.updated_at ?? j.first_published ?? Date.now()),
      };
    })
    .filter((j: NormalizedJob) => isTechRole(j.title, j.description));
}

async function fetchLever(token: string, name: string): Promise<NormalizedJob[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${token}?mode=json`);
  if (!res.ok) throw new Error(`Lever ${token}: ${res.status}`);
  const data = await res.json();
  return (data ?? [])
    .filter((j: any) => INTERN_RE.test(j.text ?? "") || /intern/i.test(j.categories?.commitment ?? ""))
    .map((j: any) => {
      const loc = j.categories?.location ?? "";
      return {
        source: "LEVER" as const,
        externalId: String(j.id),
        title: j.text,
        company: name,
        location: loc,
        isRemote: /remote/i.test(loc),
        url: j.hostedUrl,
        description: (j.descriptionPlain ?? "").slice(0, 4000),
        postedAt: new Date(j.createdAt ?? Date.now()),
      };
    })
    .filter((j: NormalizedJob) => isTechRole(j.title, j.description));
}

async function fetchAdzuna(): Promise<NormalizedJob[]> {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return [];
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${id}&app_key=${key}&what_and=software%20intern&category=it-jobs&results_per_page=50&max_days_old=45&content-type=application/json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Adzuna: ${res.status}`);
  const data = await res.json();
  return (data.results ?? [])
    .map((j: any) => {
      const loc = j.location?.display_name ?? "";
      return {
        source: "ADZUNA" as const,
        externalId: String(j.id),
        title: stripHtml(j.title ?? ""),
        company: j.company?.display_name ?? "Unknown",
        location: loc,
        isRemote: /remote/i.test(loc),
        url: j.redirect_url,
        description: stripHtml(j.description ?? "").slice(0, 4000),
        postedAt: new Date(j.created ?? Date.now()),
      };
    })
    .filter((j: NormalizedJob) => INTERN_RE.test(j.title) && isTechRole(j.title, j.description));
}

export async function fetchAllJobs(): Promise<{ jobs: NormalizedJob[]; report: string[] }> {
  const jobs: NormalizedJob[] = [];
  const report: string[] = [];
  for (const c of COMPANIES) {
    try {
      const fetched = c.source === "GREENHOUSE"
        ? await fetchGreenhouse(c.token, c.name)
        : await fetchLever(c.token, c.name);
      jobs.push(...fetched);
      report.push(`${c.name}: ${fetched.length}`);
    } catch (e) {
      report.push(`${c.name}: FAILED (${e instanceof Error ? e.message : "error"})`);
    }
  }
  try {
    const a = await fetchAdzuna();
    jobs.push(...a);
    report.push(`Adzuna: ${a.length}`);
  } catch (e) {
    report.push(`Adzuna: FAILED (${e instanceof Error ? e.message : "error"})`);
  }
  return { jobs, report };
}