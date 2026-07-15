/**
 * @sr/core — framework-free business logic (docs/design/02 §2.1).
 *
 * Next.js API routes must stay thin adapters: parse input → call a
 * function from this package → serialize output. That keeps the logic
 * testable without a web server and portable if the API layer ever moves.
 *
 * Layout (grows over milestones):
 *   policy/    authorization decisions (M0 — shape defined)
 *   services/  use-cases like joinEvent, enrollSelfie (M1/M2)
 *   repos/     data access wrappers that force org/event scoping (M1)
 */
export { can } from "./policy/can";
export type { Actor, Action, Resource } from "./policy/can";

export {
  AuthorizationError,
  ensurePersonalOrg,
  createEvent,
  listEventsForUser,
  getEventStats,
  createFtpCredential,
  listFtpCredentials,
  revokeFtpCredential,
  getEventLog,
  getManagedEvent,
  getManagedPhoto,
} from "./services/events";

export {
  CONSENT_POLICY_VERSION,
  ConsentRequiredError,
  resolveQrToken,
  joinEvent,
  getOwnedParticipant,
  markEnrollmentProcessing,
  getEnrollment,
  getGallery,
  canViewPhotoAsParticipant,
  requestDownload,
  ensureEventQr,
} from "./services/participants";
