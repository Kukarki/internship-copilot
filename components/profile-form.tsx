"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Check, FileDown } from "lucide-react";

type Profile = Record<string, any>;

const FIELDS: { key: string; label: string; placeholder?: string; type?: string }[] = [
  { key: "name", label: "Full name", placeholder: "Kushal Karki" },
  { key: "phone", label: "Phone", placeholder: "(555) 555-5555", type: "tel" },
  { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/..." },
  { key: "github", label: "GitHub URL", placeholder: "https://github.com/..." },
  { key: "portfolio", label: "Portfolio / website", placeholder: "https://..." },
  { key: "school", label: "School", placeholder: "North American University" },
  { key: "gradDate", label: "Expected graduation", placeholder: "Fall 2026" },
  { key: "workAuth", label: "Work authorization", placeholder: "F-1 student, eligible for CPT/OPT" },
  { key: "preferredLocations", label: "Preferred locations", placeholder: "Houston, Austin, Remote" },
  { key: "targetRoles", label: "Target roles", placeholder: "Software Engineer Intern, Full-Stack" },
];

export function ProfileForm() {
  const [p, setP] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resumeMsg, setResumeMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setP({
            ...d,
            preferredLocations: (d.preferredLocations ?? []).join(", "),
            targetRoles: (d.targetRoles ?? []).join(", "),
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setSaved(false);
    try {
      await fetch("/api/me/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  async function viewResume() {
    setResumeMsg(null);
    const res = await fetch("/api/resume/view");
    const d = await res.json();
    if (d.url) window.open(d.url, "_blank");
    else setResumeMsg(d.error || "Could not open resume");
  }

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading profile...</div>;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-sm font-medium">{f.label}</span>
            <input
              type={f.type ?? "text"}
              value={p[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => setP({ ...p, [f.key]: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
        ))}
      </div>

      <label className="block">
        <span className="text-sm font-medium">Why this company? (reusable answer)</span>
        <textarea
          rows={4}
          value={p.whyCompany ?? ""}
          placeholder="A short, adaptable answer you reuse on applications..."
          onChange={(e) => setP({ ...p, whyCompany: e.target.value })}
          className="mt-1 w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </label>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={save} disabled={saving}
          className="grad-bg text-white font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-60">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            : saved ? <><Check className="h-4 w-4" /> Saved</>
            : <><Save className="h-4 w-4" /> Save profile</>}
        </button>

        <button onClick={viewResume}
          className="px-5 py-2.5 rounded-xl border font-medium flex items-center gap-2 hover:bg-accent transition-colors">
          <FileDown className="h-4 w-4" /> View my resume
        </button>

        {p.email && <span className="text-sm text-muted-foreground">Signed in as {p.email}</span>}
      </div>

      {resumeMsg && <p className="text-sm text-amber-600">{resumeMsg}</p>}
    </div>
  );
}