import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "No profile" }, { status: 404 });

  if (user.resumeData) return NextResponse.json({ data: user.resumeData });

  // Seed a starting point from the uploaded resume + profile.
  const resume = await db.resume.findFirst({ where: { userId: user.id, isActive: true }, orderBy: { createdAt: "desc" } });
  const ex: any = resume?.extractedData ?? {};
  const bank: any = user.answerBank ?? {};

  const seeded = {
    name: user.name ?? "",
    email: user.email ?? "",
    phone: bank.phone ?? "",
    location: (user.preferredLocations ?? [])[0] ?? "",
    linkedin: bank.linkedin ?? "",
    github: bank.github ?? "",
    portfolio: bank.portfolio ?? "",
    summary: "",
    experience: [],
    projects: [],
    education: (ex.education ?? []).map((e: string) => ({ school: e, degree: "", location: "", dates: "", extra: "" })),
    skillGroups: (ex.skills ?? []).length ? [{ category: "Skills", items: (ex.skills ?? []).join(", ") }] : [],
    certifications: "",
  };

  return NextResponse.json({ data: seeded, seeded: true });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";

  await db.user.upsert({
    where: { clerkId: userId },
    update: { resumeData: body.data },
    create: { clerkId: userId, email, resumeData: body.data },
  });

  return NextResponse.json({ ok: true });
}