/**
 * Better Auth server configuration (docs/design/02 ADR-5).
 *
 * The `anonymous` plugin is the heart of the attendee funnel
 * (docs/design/01 §2.1): a QR-scanning attendee gets a session with no
 * signup form, sees their gallery first, and is only asked to create a
 * real account when they want to download originals. When they do,
 * Better Auth links the anonymous session's data to the new account.
 */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { anonymous } from "better-auth/plugins";
import { prisma } from "@sr/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Trust the configured URLs plus localhost in dev — the Mac browser may
  // use localhost while phones use the LAN IP (QR flow testing).
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.NODE_ENV !== "production"
      ? ["http://localhost:3000", "http://127.0.0.1:3000"]
      : []),
  ].filter((v): v is string => Boolean(v)),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    anonymous({
      emailDomainName: "anon.local",
    }),
  ],
});
