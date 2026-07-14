/**
 * Catch-all route that hands every /api/auth/* request to Better Auth
 * (sign-in, sign-up, session, sign-out, anonymous sessions, …).
 */
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth.handler);
