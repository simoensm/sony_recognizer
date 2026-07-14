/** Server-side session helper for route handlers and server components. */
import { headers } from "next/headers";
import { auth } from "./auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
