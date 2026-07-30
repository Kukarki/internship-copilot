import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";
import { extractDocxText } from "@/lib/extract-text";
import { extractResumeFromText, extractResumeFromFile } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = [".pdf", ".docx", ".png", ".jpg", ".jpeg", ".webp"];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const name = file.name.toLowerCase();
    const ext = ALLOWED.find((e) => name.endsWith(e));
    if (!ext) return NextResponse.json({ error: "Upload a PDF, DOCX, or image" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    let extracted;
    if (ext === ".docx") {
      const text = await extractDocxText(buffer);
      if (!text || text.trim().length < 20) {
        return NextResponse.json({ error: "Couldnt read that DOCX" }, { status: 422 });
      }
      extracted = await extractResumeFromText(text);
    } else {
      const mime =
        ext === ".pdf" ? "application/pdf"
        : ext === ".png" ? "image/png"
        : ext === ".webp" ? "image/webp"
        : "image/jpeg";
      extracted = await extractResumeFromFile(buffer.toString("base64"), mime);
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;
    const user = await db.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: { clerkId: userId, email, name: fullName },
    });

    // Private storage: keep only the path, never a public URL.
    const safeExt = ext.replace(".", "") || "bin";
    const path = `${userId.replace(/[^a-zA-Z0-9]/g, "")}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("resumes")
      .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true });
    if (upErr) {
      console.error("Supabase upload error:", upErr);
      return NextResponse.json({ error: "File storage failed" }, { status: 500 });
    }

    await db.resume.updateMany({ where: { userId: user.id, isActive: true }, data: { isActive: false } });
    const resume = await db.resume.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileUrl: path,
        extractedData: extracted,
        isActive: true,
      },
    });

    return NextResponse.json({ id: resume.id, extracted });
  } catch (err) {
    console.error("Resume upload failed:", err);
    return NextResponse.json({ error: "Something went wrong processing the resume" }, { status: 500 });
  }
}