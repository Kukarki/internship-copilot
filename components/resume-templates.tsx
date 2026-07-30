"use client";

export type ResumeData = {
  name: string; email: string; phone: string; location: string;
  linkedin: string; github: string; portfolio: string; summary: string;
  experience: { title: string; company: string; location: string; dates: string; bullets: string }[];
  projects: { name: string; tech: string; bullets: string }[];
  education: { school: string; degree: string; location: string; dates: string; extra: string }[];
  skillGroups: { category: string; items: string }[];
  certifications: string;
};

export const TEMPLATES = [
  { id: "classic",   name: "Classic",        ats: true,  note: "Safest for ATS" },
  { id: "modern",    name: "Modern Accent",  ats: true,  note: "ATS-safe, colored headers" },
  { id: "minimal",   name: "Minimal",        ats: true,  note: "Lots of whitespace" },
  { id: "bold",      name: "Bold Header",    ats: true,  note: "Strong name banner" },
  { id: "serif",     name: "Elegant Serif",  ats: true,  note: "Traditional, formal" },
  { id: "compact",   name: "Compact Tech",   ats: true,  note: "Fits more on one page" },
  { id: "sidebar",   name: "Sidebar",        ats: false, note: "Two-column - may confuse ATS" },
  { id: "timeline",  name: "Timeline",       ats: false, note: "Visual - may confuse ATS" },
];

export const RESUME_CSS = `
.sheet{width:8.5in;min-height:11in;padding:0.5in;background:#fff;color:#111;box-sizing:border-box;font-size:10.5pt;line-height:1.4}
.sheet h1{margin:0;font-size:22pt;letter-spacing:.3px}
.sheet h2{margin:14px 0 6px;font-size:11pt;text-transform:uppercase;letter-spacing:1px}
.sheet h3{margin:0;font-size:10.5pt}
.sheet p,.sheet li{margin:2px 0}
.sheet ul{margin:4px 0 0 16px;padding:0}
.contact{font-size:9.5pt;color:#444}
.row{display:flex;justify-content:space-between;gap:10px}
.muted{color:#555}
.item{margin-bottom:10px}

/* classic */
.tpl-classic{font-family:Georgia,"Times New Roman",serif}
.tpl-classic .head{text-align:center;border-bottom:2px solid #111;padding-bottom:8px}
.tpl-classic h2{border-bottom:1px solid #999;padding-bottom:2px}

/* modern */
.tpl-modern{font-family:Helvetica,Arial,sans-serif}
.tpl-modern .head{border-bottom:3px solid #6d28d9;padding-bottom:8px}
.tpl-modern h1{color:#4c1d95}
.tpl-modern h2{color:#6d28d9;border-bottom:1px solid #ddd6fe;padding-bottom:2px}

/* minimal */
.tpl-minimal{font-family:Helvetica,Arial,sans-serif;font-size:10pt}
.tpl-minimal h1{font-weight:300;font-size:24pt}
.tpl-minimal h2{color:#888;font-size:9pt;letter-spacing:2px;border:none}
.tpl-minimal .head{padding-bottom:14px}
.tpl-minimal .item{margin-bottom:14px}

/* bold */
.tpl-bold{font-family:Helvetica,Arial,sans-serif}
.tpl-bold .head{background:#111;color:#fff;margin:-0.5in -0.5in 16px;padding:26px 0.5in}
.tpl-bold .head .contact{color:#ccc}
.tpl-bold h2{background:#f1f1f1;padding:3px 6px}

/* serif */
.tpl-serif{font-family:"Palatino Linotype",Palatino,Georgia,serif}
.tpl-serif h1{font-variant:small-caps;letter-spacing:1px}
.tpl-serif .head{text-align:center;padding-bottom:10px}
.tpl-serif h2{font-variant:small-caps;letter-spacing:.5px;border-bottom:1px solid #333}

/* compact */
.tpl-compact{font-family:Helvetica,Arial,sans-serif;font-size:9.5pt;line-height:1.3}
.tpl-compact h1{font-size:18pt}
.tpl-compact h2{margin:9px 0 3px;font-size:10pt;border-bottom:1px solid #333}
.tpl-compact .item{margin-bottom:7px}
.tpl-compact ul{margin-left:14px}

/* sidebar */
.tpl-sidebar{font-family:Helvetica,Arial,sans-serif;display:flex;gap:22px;padding:0}
.tpl-sidebar .side{width:2.3in;background:#f4f2fb;padding:0.5in 0.35in;box-sizing:border-box}
.tpl-sidebar .main{flex:1;padding:0.5in 0.5in 0.5in 0}
.tpl-sidebar h1{font-size:19pt;color:#4c1d95}
.tpl-sidebar h2{color:#6d28d9;border-bottom:1px solid #ddd}
.tpl-sidebar .side h2{border:none;color:#4c1d95}

/* timeline */
.tpl-timeline{font-family:Helvetica,Arial,sans-serif}
.tpl-timeline .head{border-left:6px solid #6d28d9;padding-left:12px}
.tpl-timeline h2{color:#4c1d95}
.tpl-timeline .item{border-left:2px solid #e5e7eb;padding-left:14px;position:relative}
.tpl-timeline .item:before{content:"";position:absolute;left:-5px;top:5px;width:8px;height:8px;border-radius:50%;background:#6d28d9}
`;

function lines(s: string) {
  return (s || "").split("\n").map((x) => x.trim()).filter(Boolean);
}

function Contact({ d }: { d: ResumeData }) {
  const parts = [d.email, d.phone, d.location, d.linkedin, d.github, d.portfolio].filter(Boolean);
  return <div className="contact">{parts.join("  |  ")}</div>;
}

function Sections({ d }: { d: ResumeData }) {
  return (
    <>
      {d.summary && (<><h2>Summary</h2><p>{d.summary}</p></>)}

      {d.experience?.length > 0 && (<><h2>Experience</h2>
        {d.experience.map((e, i) => (
          <div className="item" key={i}>
            <div className="row"><h3>{e.title}{e.company ? ` - ${e.company}` : ""}</h3><span className="muted">{e.dates}</span></div>
            {e.location && <div className="muted">{e.location}</div>}
            {lines(e.bullets).length > 0 && <ul>{lines(e.bullets).map((b, k) => <li key={k}>{b}</li>)}</ul>}
          </div>
        ))}</>)}

      {d.projects?.length > 0 && (<><h2>Projects</h2>
        {d.projects.map((p, i) => (
          <div className="item" key={i}>
            <div className="row"><h3>{p.name}</h3><span className="muted">{p.tech}</span></div>
            {lines(p.bullets).length > 0 && <ul>{lines(p.bullets).map((b, k) => <li key={k}>{b}</li>)}</ul>}
          </div>
        ))}</>)}

      {d.education?.length > 0 && (<><h2>Education</h2>
        {d.education.map((e, i) => (
          <div className="item" key={i}>
            <div className="row"><h3>{e.school}</h3><span className="muted">{e.dates}</span></div>
            <div className="muted">{[e.degree, e.location, e.extra].filter(Boolean).join(" | ")}</div>
          </div>
        ))}</>)}

      {d.certifications && (<><h2>Certifications</h2><ul>{lines(d.certifications).map((c, i) => <li key={i}>{c}</li>)}</ul></>)}
    </>
  );
}

function Skills({ d }: { d: ResumeData }) {
  if (!d.skillGroups?.length) return null;
  return (
    <>
      <h2>Skills</h2>
      {d.skillGroups.map((g, i) => (
        <p key={i}><strong>{g.category}:</strong> {g.items}</p>
      ))}
    </>
  );
}

export function ResumePreview({ d, template }: { d: ResumeData; template: string }) {
  if (template === "sidebar") {
    return (
      <div className={`sheet tpl-sidebar`}>
        <div className="side">
          <h1>{d.name}</h1>
          <div style={{ marginTop: 10 }}>
            {[d.email, d.phone, d.location, d.linkedin, d.github, d.portfolio].filter(Boolean).map((x, i) => (
              <p key={i} className="contact">{x}</p>
            ))}
          </div>
          <Skills d={d} />
        </div>
        <div className="main"><Sections d={d} /></div>
      </div>
    );
  }

  return (
    <div className={`sheet tpl-${template}`}>
      <div className="head">
        <h1>{d.name}</h1>
        <Contact d={d} />
      </div>
      <Sections d={d} />
      <Skills d={d} />
    </div>
  );
}

/** Open a clean print window containing only the resume. */
export function printResume(node: HTMLElement | null, name: string) {
  if (!node) return;
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${name || "Resume"}</title>
    <style>${RESUME_CSS}
    body{margin:0;background:#fff}
    @page{size:letter;margin:0}
    </style></head><body>${node.outerHTML}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 350);
}