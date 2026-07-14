/** Account settings: profile + password. */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AppHeader } from "@/components/AppHeader";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { PasswordForm } from "@/components/settings/PasswordForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold tracking-wide uppercase">Settings</h1>

        <div className="mt-10 flex flex-col gap-10">
          <section>
            <h2 className="text-sm font-semibold tracking-[0.2em] text-white/75 uppercase">
              Profile
            </h2>
            <ProfileForm initialName={session.user.name} email={session.user.email} />
          </section>

          <section>
            <h2 className="text-sm font-semibold tracking-[0.2em] text-white/75 uppercase">
              Password
            </h2>
            <PasswordForm />
          </section>
        </div>
      </main>
    </>
  );
}
