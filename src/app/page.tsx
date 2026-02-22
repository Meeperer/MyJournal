import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { JournalDashboard } from "@/components/JournalDashboard";
import { HeaderWithTheme } from "@/components/HeaderWithTheme";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userEmail = session.user.email ?? "";

  return (
    <div className="relative flex min-h-screen justify-center px-4 py-10 sm:px-8 sm:py-16">
      <main className="flex w-full max-w-5xl flex-col gap-10">
        <HeaderWithTheme userEmail={userEmail} />
        <JournalDashboard />
      </main>
    </div>
  );
}

