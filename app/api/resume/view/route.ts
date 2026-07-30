import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const resume = await db.resume.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!resume) return NextResponse.json({ error: "No resume" }, { status: 404 });

  // Old records may hold a full public URL; only sign real storage paths.
  if (/^https?:\/\//i.test(resume.fileUrl)) {
    return NextResponse.json({ error: "Re-upload your resume to enable secure viewing" }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from("resumes")
    .createSignedUrl(resume.fileUrl, 60 * 5); // valid 5 minutes

  if (error || !data) {
    console.error("Signed URL error:", error);
    return NextResponse.json({ error: "Could not create link" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl, fileName: resume.fileName });
}