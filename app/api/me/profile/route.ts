import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const parts = (user.name ?? "").trim().split(" ");
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") ?? "";

  const res = NextResponse.json({
    firstName,
    lastName,
    email: user.email,
    phone: "",
    linkedin: "",
    github: "",
  });
  // Allow the extension to read this.
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}