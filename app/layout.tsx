import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Internship Copilot",
  description: "AI-powered internship search, matching, and applications",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
          <TopNav signedIn={!!userId}>
            {userId ? (
              <UserButton />
            ) : (
              <div className="flex items-center gap-2">
                <SignInButton>
                  <button className="px-3 py-1.5 rounded-md text-sm hover:bg-accent transition-colors">Sign in</button>
                </SignInButton>
                <SignUpButton>
                  <Button size="sm">Get started</Button>
                </SignUpButton>
              </div>
            )}
          </TopNav>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}