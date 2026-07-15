"use client";

/**
 * The attendee funnel (docs/design/01 §2.1), one screen at a time:
 *   consent → (invisible anonymous session) → selfie → matching → gallery
 * No signup form anywhere — value first, account later.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { FollowLinks } from "./FollowLinks";

type Step = "consent" | "selfie" | "processing" | "failed";

const RETAKE_MESSAGES: Record<string, string> = {
  no_face: "We couldn't find a face — try better light, camera at eye level.",
  multiple_faces: "More than one face in the picture — make sure you're alone in frame.",
  low_quality: "The picture is too blurry or dark — try again.",
  internal_error: "Something went wrong on our side — please try once more.",
};

export function JoinFlow({ qrToken, eventId }: { qrToken: string; eventId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("consent");
  const [consented, setConsented] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      // Invisible account: an anonymous session, upgradeable later.
      const session = await authClient.getSession();
      if (!session.data) {
        const anon = await authClient.signIn.anonymous();
        if (anon.error) throw new Error(anon.error.message);
      }
      const res = await fetch(`/api/v1/events/${eventId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken, consent: consented }),
      });
      if (!res.ok) throw new Error("join failed");
      const { participant } = await res.json();
      setParticipantId(participant.id);
      if (participant.enrollmentStatus === "ready") {
        router.push(`/gallery/${participant.id}`); // rejoining — already enrolled
        return;
      }
      setStep("selfie");
    } catch {
      setError("Could not join — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadSelfie(file: File) {
    if (!participantId) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("selfie", file);
    const res = await fetch(`/api/v1/participants/${participantId}/selfie`, {
      method: "POST",
      body: form,
    });
    setBusy(false);
    if (!res.ok) {
      setError("Upload failed — please try again.");
      return;
    }
    setStep("processing");
    poll();
  }

  function poll() {
    const timer = setInterval(async () => {
      const res = await fetch(`/api/v1/participants/${participantId}/enrollment`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const e = await res.json();
      if (e.status === "ready") {
        clearInterval(timer);
        router.push(`/gallery/${participantId}`);
      } else if (e.status === "failed") {
        clearInterval(timer);
        setError(RETAKE_MESSAGES[e.error ?? ""] ?? "Please try another picture.");
        setStep("failed");
      }
    }, 1500);
  }

  if (step === "consent") {
    return (
      <div className="panel flex flex-col gap-5 border border-white/15 p-6">
        <p className="text-sm leading-relaxed text-white/85">
          Take one selfie and instantly get every event photo you appear in.
        </p>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-white/85">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-1 h-4 w-4 accent-white"
          />
          <span>
            I agree that my selfie is converted into a face signature to find my
            photos <strong>for this event only</strong>. My data is deleted when I
            withdraw or when the event's retention period ends.
          </span>
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={join}
          disabled={!consented || busy}
          className="rounded-xl border border-white bg-transparent px-4 py-3 font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black disabled:opacity-40"
        >
          {busy ? "One moment…" : "Continue"}
        </button>
      </div>
    );
  }

  if (step === "selfie" || step === "failed") {
    return (
      <div className="panel flex flex-col gap-5 border border-white/15 p-6 text-center">
        <p className="text-sm text-white/85">
          {step === "failed" ? "Let's try that again." : "Now take a selfie 🤳"}
        </p>
        {error && <p className="text-sm text-amber-400">{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadSelfie(f);
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-xl border border-white bg-transparent px-4 py-3 font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black disabled:opacity-40"
        >
          {busy ? "Uploading…" : step === "failed" ? "Retake selfie" : "Take selfie"}
        </button>
        <FollowLinks />
      </div>
    );
  }

  return (
    <div className="panel flex flex-col items-center gap-4 border border-white/15 p-8 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      <p className="text-sm text-white/85">Finding your photos…</p>
      <p className="text-xs text-white/65">This usually takes a few seconds.</p>
      <div className="w-full">
        <FollowLinks />
      </div>
    </div>
  );
}
