/**
 * Authorization policy — THE single place permission decisions are made
 * (docs/design/06 §2). API routes and services call can(); nothing else
 * in the codebase is allowed to decide "is this user permitted".
 *
 * Deny-by-default: anything not explicitly allowed below is forbidden.
 * Real rules land in M1/M2 alongside the features they protect; the shape
 * is defined now so every feature is forced through this gate from day one.
 */

export type Actor =
  | { kind: "participant"; participantId: string; eventId: string }
  | { kind: "orgMember"; userId: string; orgId: string; role: "owner" | "admin" | "photographer" }
  | { kind: "system" };

export type Action =
  // attendee actions
  | "gallery.view"
  | "photo.download"
  | "match.confirm"
  // photographer/organizer actions
  | "event.manage"
  | "photo.manage"
  | "org.manage";

export type Resource =
  | { kind: "event"; eventId: string; orgId: string }
  | { kind: "photo"; photoId: string; eventId: string; orgId: string }
  | { kind: "participantScope"; participantId: string; eventId: string }
  | { kind: "org"; orgId: string };

export function can(actor: Actor, action: Action, resource: Resource): boolean {
  // The system actor (workers, cron) bypasses policy — it acts on behalf
  // of the platform, and its inputs come from validated queue contracts.
  if (actor.kind === "system") return true;

  switch (action) {
    case "gallery.view":
    case "photo.download":
    case "match.confirm":
      // An attendee may only act within their OWN participation.
      return (
        actor.kind === "participant" &&
        resource.kind === "participantScope" &&
        actor.participantId === resource.participantId &&
        actor.eventId === resource.eventId
      );

    case "event.manage":
    case "photo.manage":
      // Org admins/owners manage everything in their org.
      // Photographers: per-event assignment check added in M1 (needs DB lookup).
      return (
        actor.kind === "orgMember" &&
        (resource.kind === "event" || resource.kind === "photo") &&
        actor.orgId === resource.orgId &&
        (actor.role === "owner" || actor.role === "admin")
      );

    case "org.manage":
      return (
        actor.kind === "orgMember" &&
        resource.kind === "org" &&
        actor.orgId === resource.orgId &&
        actor.role === "owner"
      );

    default: {
      // Exhaustiveness guard: adding an Action without a rule fails typecheck.
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
