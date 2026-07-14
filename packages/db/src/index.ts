/**
 * Database client singleton.
 *
 * Next.js hot-reloads modules in development, which would otherwise create
 * a new connection pool on every code change and exhaust Postgres.
 * The globalThis trick keeps exactly one client alive per process.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-export all generated types (User, Event, Photo, …) so other packages
// import from "@sr/db" and never depend on @prisma/client directly.
export * from "@prisma/client";
