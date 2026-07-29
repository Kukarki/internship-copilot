import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Send, CalendarCheck, Trophy, FileText, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Please sign in.</p>
      </main>
    );
  }

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  const resume = user ? await db.resume.findFirst({ where: { userId: user.id, isActive: true } }) : null;
  const apps = user ? await db.application.findMany({ where: { userId: user.id } }) : [];
  const totalJobs = await db.job.count({ where: { visaStatus: { not: "BLOCKED" } } });

  const c = { applied: 0, interviewing: 0, offer: 0 };
  for (const a of apps) {
    if (a.status === "APPLIED") c.applied++;
    if (a.status === "INTERVIEWING") c.interviewing++;
    if (a.status === "OFFER") c.offer++;
  }
  const skills: string[] = (resume?.extractedData as any)?.skills ?? [];

  const stats = [
    { label: "Internships available", value: totalJobs, icon: Briefcase },
    { label: "Applied", value: c.applied, icon: Send },
    { label: "Interviewing", value: c.interviewing, icon: CalendarCheck },
    { label: "Offers", value: c.offer, icon: Trophy },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p className="text-muted-foreground mt-1">Here is where your search stands.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-3xl font-bold mt-2">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-6 flex flex-col justify-between h-full gap-4">
            <div>
              <h2 className="text-lg font-semibold">Find your next internship</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Browse {totalJobs} roles, matched and ranked against your resume.
              </p>
            </div>
            <Link href="/jobs">
              <Button className="w-full sm:w-auto">
                Browse jobs <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Your resume</h2>
            </div>
            {resume ? (
              <>
                <p className="text-sm text-muted-foreground">{skills.length} skills detected</p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.slice(0, 8).map((s) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{s}</span>
                  ))}
                  {skills.length > 8 && <span className="text-xs text-muted-foreground">+{skills.length - 8}</span>}
                </div>
                <Link href="/" className="text-sm text-primary hover:underline inline-block">Update resume</Link>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No resume yet. Upload one to unlock matching.</p>
                <Link href="/"><Button size="sm" variant="secondary">Upload resume</Button></Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}