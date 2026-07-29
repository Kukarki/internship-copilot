import { auth } from "@clerk/nextjs/server";
import { ResumeUpload } from "@/components/resume-upload";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="p-6">
      {userId ? (
        <ResumeUpload />
      ) : (
        <p className="text-center mt-20 text-muted-foreground">
          Sign in to upload your resume.
        </p>
      )}
    </main>
  );
}