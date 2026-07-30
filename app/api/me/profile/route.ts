import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const bank: any = user.answerBank ?? {};
  const parts = (user.name ?? "").trim().split(" ");

  const res = NextResponse.json({
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") ?? "",
    name: user.name ?? "",
    email: user.email,
    phone: bank.phone ?? "",
    linkedin: bank.linkedin ?? "",
    github: bank.github ?? "",
    portfolio: bank.portfolio ?? "",
    school: bank.school ?? "",
    gradDate: bank.gradDate ?? "",
    workAuth: bank.workAuth ?? "",
    whyCompany: bank.whyCompany ?? "",
    preferredLocations: user.preferredLocations ?? [],
    targetRoles: user.targetRoles ?? [],
  });
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";

  const bank = {
    phone: body.phone ?? "",
    linkedin: body.linkedin ?? "",
    github: body.github ?? "",
    portfolio: body.portfolio ?? "",
    school: body.school ?? "",
    gradDate: body.gradDate ?? "",
    workAuth: body.workAuth ?? "",
    whyCompany: body.whyCompany ?? "",
  };

  const locations = String(body.preferredLocations ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const roles = String(body.targetRoles ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);

  await db.user.upsert({
    where: { clerkId: userId },
    update: { name: body.name || undefined, answerBank: bank, preferredLocations: locations, targetRoles: roles },
    create: { clerkId: userId, email, name: body.name || null, answerBank: bank, preferredLocations: locations, targetRoles: roles },
  });

  return NextResponse.json({ ok: true });
}