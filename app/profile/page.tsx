import { auth } from "@clerk/nextjs/server";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) {
    return <main className="max-w-3xl mx-auto px-4 py-16 text-center"><p className="text-muted-foreground">Sign in to edit your profile.</p></main>;
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your reusable application details. Saved once, used everywhere.
        </p>
      </div>
      <ProfileForm />
    </main>
  );
}