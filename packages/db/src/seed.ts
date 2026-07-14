/**
 * Development seed: creates everything needed to test the camera pipeline.
 *
 *   pnpm db:seed
 *
 * Creates (idempotently — safe to run twice):
 *   - a demo photographer user + personal organization
 *   - a live demo event
 *   - FTP credentials for the camera (password printed ONCE — copy it)
 *   - a QR code token (used from M2)
 *
 * NEVER run against production: real credentials come from the dashboard.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Store passwords as scrypt:<salt>:<hash> — same format apps/ingest verifies. */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: { name: "Demo Photographer", email: "demo@example.com" },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      name: "Demo Organization",
      slug: "demo-org",
      members: { create: { userId: user.id, role: "owner" } },
    },
  });

  const event = await prisma.event.upsert({
    where: { orgId_slug: { orgId: org.id, slug: "demo-event" } },
    update: { status: "live" },
    create: {
      orgId: org.id,
      name: "Demo Event",
      slug: "demo-event",
      status: "live",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });

  // Fresh camera password on every seed run (old one is replaced).
  // Lowercase + digits only, no confusable chars (0/o, 1/l) — camera
  // keyboards are painful. Override for dev: SEED_FTP_PASSWORD=mypass pnpm db:seed
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const ftpPassword =
    process.env.SEED_FTP_PASSWORD ??
    Array.from(randomBytes(8), (b) => alphabet[b % alphabet.length]).join("");
  const ftpUsername = "democam";

  await prisma.ftpCredential.upsert({
    where: { username: ftpUsername },
    update: { passwordHash: hashPassword(ftpPassword) },
    create: {
      eventId: event.id,
      username: ftpUsername,
      passwordHash: hashPassword(ftpPassword),
      s3Prefix: `orgs/${org.id}/events/${event.id}`,
      label: "Dev camera",
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });

  const qrToken = randomBytes(16).toString("base64url");
  const existingQr = await prisma.qrCode.findFirst({ where: { eventId: event.id } });
  if (!existingQr) {
    await prisma.qrCode.create({
      data: { eventId: event.id, token: qrToken, label: "Dev QR" },
    });
  }

  console.log(`
Seed complete.

┌─ Camera FTP settings ────────────────────────────
│  User name:   ${ftpUsername}
│  Password:    ${ftpPassword}     ← shown only now
│  Port:        2121
│  Host:        your Mac's IP → run: ipconfig getifaddr en0
│  Passive:     ON      Secure (FTPS): OFF (dev only)
└──────────────────────────────────────────────────
Event: "${event.name}"  (id ${event.id})
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
