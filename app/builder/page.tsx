import { auth } from "@clerk/nextjs/server";
import { ResumeBuilder } from "@/components/resume-builder";

export default async function BuilderPage() {
  const { userId } = await auth();
  if (!userId) return <main className="max-w-3xl mx-auto px-4 py-16 text-center"><p className="text-muted-foreground">Sign in to build your resume.</p></main>;
  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resume builder</h1>
        <p className="text-muted-foreground mt-1 text-sm">Pick a template, edit on the left, download a print-ready PDF.</p>
      </div>
      <ResumeBuilder />
    </main>
  );
}