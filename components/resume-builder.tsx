"use client";

import { useEffect, useRef, useState } from "react";
import { ResumePreview, printResume, TEMPLATES, RESUME_CSS, type ResumeData } from "@/components/resume-templates";
import { Loader2, Save, Check, Printer, Plus, Trash2 } from "lucide-react";

const EMPTY: ResumeData = {
  name: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "",
  summary: "", experience: [], projects: [], education: [], skillGroups: [], certifications: "",
};

export function ResumeBuilder() {
  const [d, setD] = useState<ResumeData>(EMPTY);
  const [tpl, setTpl] = useState("classic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me/resume-data").then((r) => r.json()).then((res) => {
      if (res.data) setD({ ...EMPTY, ...res.data });
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setSaved(false);
    try {
      await fetch("/api/me/resume-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: d }) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  const set = (k: keyof ResumeData, v: any) => setD({ ...d, [k]: v });
  const addTo = (k: "experience" | "projects" | "education" | "skillGroups", blank: any) => set(k, [...(d[k] as any[]), blank]);
  const removeAt = (k: "experience" | "projects" | "education" | "skillGroups", i: number) =>
    set(k, (d[k] as any[]).filter((_, x) => x !== i));
  const editAt = (k: "experience" | "projects" | "education" | "skillGroups", i: number, field: string, v: string) =>
    set(k, (d[k] as any[]).map((it, x) => (x === i ? { ...it, [field]: v } : it)));

  const input = "w-full px-2.5 py-1.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>;

  return (
    <div className="space-y-5">
      <style dangerouslySetInnerHTML={{ __html: RESUME_CSS }} />

      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button key={t.id} onClick={() => setTpl(t.id)} title={t.note}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${tpl === t.id ? "grad-bg text-white border-transparent" : "bg-card hover:bg-accent"}`}>
            {t.name}{!t.ats && " *"}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">* Two-column and visual layouts can confuse ATS parsers. Classic, Modern, Minimal, Bold, Serif and Compact are the safe picks.</p>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="grad-bg text-white font-medium px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-60">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save</>}
        </button>
        <button onClick={() => printResume(previewRef.current?.firstElementChild as HTMLElement, d.name)}
          className="px-4 py-2 rounded-xl border font-medium flex items-center gap-2 hover:bg-accent">
          <Printer className="h-4 w-4" /> Download PDF
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* EDITOR */}
        <div className="space-y-5">
          <section className="rounded-xl border bg-card p-4 space-y-2">
            <h3 className="font-semibold text-sm">Contact</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {["name","email","phone","location","linkedin","github","portfolio"].map((k) => (
                <input key={k} className={input} placeholder={k} value={(d as any)[k]} onChange={(e) => set(k as any, e.target.value)} />
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4 space-y-2">
            <h3 className="font-semibold text-sm">Summary</h3>
            <textarea rows={3} className={input} placeholder="Two lines on who you are and what you build."
              value={d.summary} onChange={(e) => set("summary", e.target.value)} />
          </section>

          <section className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Experience</h3>
              <button onClick={() => addTo("experience", { title:"", company:"", location:"", dates:"", bullets:"" })} className="text-xs flex items-center gap-1 text-primary"><Plus className="h-3 w-3" /> Add</button>
            </div>
            {d.experience.map((e, i) => (
              <div key={i} className="space-y-2 border-t pt-3 first:border-0 first:pt-0">
                <div className="grid sm:grid-cols-2 gap-2">
                  <input className={input} placeholder="Job title" value={e.title} onChange={(ev) => editAt("experience", i, "title", ev.target.value)} />
                  <input className={input} placeholder="Company" value={e.company} onChange={(ev) => editAt("experience", i, "company", ev.target.value)} />
                  <input className={input} placeholder="Location" value={e.location} onChange={(ev) => editAt("experience", i, "location", ev.target.value)} />
                  <input className={input} placeholder="Jun 2025 - Aug 2025" value={e.dates} onChange={(ev) => editAt("experience", i, "dates", ev.target.value)} />
                </div>
                <textarea rows={3} className={input} placeholder="One bullet per line" value={e.bullets} onChange={(ev) => editAt("experience", i, "bullets", ev.target.value)} />
                <button onClick={() => removeAt("experience", i)} className="text-xs text-red-500 flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
              </div>
            ))}
          </section>

          <section className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Projects</h3>
              <button onClick={() => addTo("projects", { name:"", tech:"", bullets:"" })} className="text-xs flex items-center gap-1 text-primary"><Plus className="h-3 w-3" /> Add</button>
            </div>
            {d.projects.map((p, i) => (
              <div key={i} className="space-y-2 border-t pt-3 first:border-0 first:pt-0">
                <div className="grid sm:grid-cols-2 gap-2">
                  <input className={input} placeholder="Project name" value={p.name} onChange={(ev) => editAt("projects", i, "name", ev.target.value)} />
                  <input className={input} placeholder="React, Node, Postgres" value={p.tech} onChange={(ev) => editAt("projects", i, "tech", ev.target.value)} />
                </div>
                <textarea rows={3} className={input} placeholder="One bullet per line" value={p.bullets} onChange={(ev) => editAt("projects", i, "bullets", ev.target.value)} />
                <button onClick={() => removeAt("projects", i)} className="text-xs text-red-500 flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
              </div>
            ))}
          </section>

          <section className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Education</h3>
              <button onClick={() => addTo("education", { school:"", degree:"", location:"", dates:"", extra:"" })} className="text-xs flex items-center gap-1 text-primary"><Plus className="h-3 w-3" /> Add</button>
            </div>
            {d.education.map((e, i) => (
              <div key={i} className="space-y-2 border-t pt-3 first:border-0 first:pt-0">
                <div className="grid sm:grid-cols-2 gap-2">
                  <input className={input} placeholder="School" value={e.school} onChange={(ev) => editAt("education", i, "school", ev.target.value)} />
                  <input className={input} placeholder="B.S. Computer Science" value={e.degree} onChange={(ev) => editAt("education", i, "degree", ev.target.value)} />
                  <input className={input} placeholder="Location" value={e.location} onChange={(ev) => editAt("education", i, "location", ev.target.value)} />
                  <input className={input} placeholder="Expected Fall 2026" value={e.dates} onChange={(ev) => editAt("education", i, "dates", ev.target.value)} />
                </div>
                <input className={input} placeholder="GPA, honors, relevant coursework" value={e.extra} onChange={(ev) => editAt("education", i, "extra", ev.target.value)} />
                <button onClick={() => removeAt("education", i)} className="text-xs text-red-500 flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
              </div>
            ))}
          </section>

          <section className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Skills</h3>
              <button onClick={() => addTo("skillGroups", { category:"", items:"" })} className="text-xs flex items-center gap-1 text-primary"><Plus className="h-3 w-3" /> Add group</button>
            </div>
            {d.skillGroups.map((g, i) => (
              <div key={i} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2 items-center">
                <input className={input} placeholder="Languages" value={g.category} onChange={(ev) => editAt("skillGroups", i, "category", ev.target.value)} />
                <input className={input} placeholder="Java, Python, TypeScript" value={g.items} onChange={(ev) => editAt("skillGroups", i, "items", ev.target.value)} />
                <button onClick={() => removeAt("skillGroups", i)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </section>

          <section className="rounded-xl border bg-card p-4 space-y-2">
            <h3 className="font-semibold text-sm">Certifications</h3>
            <textarea rows={3} className={input} placeholder="One per line" value={d.certifications} onChange={(e) => set("certifications", e.target.value)} />
          </section>
        </div>

        {/* PREVIEW */}
        <div className="lg:sticky lg:top-20 h-fit">
          <div className="rounded-xl border bg-muted/30 p-4 overflow-auto">
            <div ref={previewRef} style={{ transform: "scale(0.62)", transformOrigin: "top left", width: "8.5in" }}>
              <ResumePreview d={d} template={tpl} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}