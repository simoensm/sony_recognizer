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
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    anonymous({
      emailDomainName: "anon.local",
    }),
  ],
});
