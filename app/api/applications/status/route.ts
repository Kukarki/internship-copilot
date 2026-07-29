import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const VALID = ["SAVED", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"];

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, status } = await req.json();
  if (!jobId || !VALID.includes(status)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "No profile" }, { status: 400 });

  await db.application.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    update: { status, lastActionAt: new Date() },
    create: { userId: user.id, jobId, status, lastActionAt: new Date() },
  });

  return NextResponse.json({ ok: true, status });
}