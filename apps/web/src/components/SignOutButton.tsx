"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        router.push("/signin");
      }}
      className="text-white/60 hover:text-white"
    >
      Sign out
    </button>
  );
}
