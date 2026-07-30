import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  await db.application.deleteMany({ where: { jobId } });
  await db.job.delete({ where: { id: jobId } }).catch(() => {});
  return NextResponse.json({ ok: true });
}