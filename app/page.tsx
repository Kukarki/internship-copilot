import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignUpButton } from "@clerk/nextjs";
import { ResumeUpload } from "@/components/resume-upload";
import { Sparkles, ShieldCheck, Target, FileText } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <ResumeUpload />
      </main>
    );
  }

  const features = [
    { icon: ShieldCheck, title: "F-1 / OPT visa filter", desc: "Only see internships that can actually sponsor you." },
    { icon: Target, title: "AI match scoring", desc: "Every job ranked against your resume, best fits first." },
    { icon: FileText, title: "Tailored materials", desc: "One-click cover letters and resumes for each role." },
  ];

  return (
    <main className="relative overflow-hidden">
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full grad-bg opacity-20 blur-3xl" />
      <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full grad-bg opacity-20 blur-3xl" />

      <section className="relative max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full grad-border">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> AI INTERNSHIP COPILOT
        </span>

        <h1 className="mt-6 text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05]">
          Land the internship <br />
          <span className="grad-text">built for your visa.</span>
        </h1>

        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Find internships that sponsor F-1 / OPT, ranked against your resume by AI —
          with tailored cover letters and resumes in one click.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <SignUpButton>
            <button className="grad-bg text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:opacity-90 transition-opacity">
              Get started free
            </button>
          </SignUpButton>
          <a href="https://github.com/Kukarki/internship-copilot" target="_blank" rel="noreferrer"
            className="px-6 py-3 rounded-xl border font-semibold hover:bg-accent transition-colors">
            View on GitHub
          </a>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <span><b className="grad-text font-bold">50+</b> companies</span>
          <span className="text-muted-foreground">·</span>
          <span><b className="grad-text font-bold">F-1</b> filtered</span>
          <span className="text-muted-foreground">·</span>
          <span><b className="grad-text font-bold">AI</b> matched</span>
        </div>
      </section>

      <section className="relative max-w-5xl mx-auto px-4 pb-24 grid sm:grid-cols-3 gap-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-6 hover:shadow-lg transition-shadow">
            <div className="h-11 w-11 rounded-xl grad-bg grid place-items-center text-white">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}