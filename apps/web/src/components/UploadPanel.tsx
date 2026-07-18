"use client";

/** Manual photo upload — the fallback when FTP wasn't running.
 *  Sends files one by one with live progress; duplicates are skipped. */
import { useRef, useState } from "react";

export function UploadPanel({ eventId }: { eventId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function upload(files: FileList) {
    const list = Array.from(files);
    let done = 0;
    let duplicates = 0;
    let failed = 0;

    for (const file of list) {
      setProgress(`Uploading ${done + 1} / ${list.length}…`);
      const form = new FormData();
      form.append("photo", file);
      try {
        const res = await fetch(`/api/v1/events/${eventId}/photos`, {
          method: "POST",
          body: form,
        });
        if (res.ok) {
          const body = await res.json();
          if (body.duplicate) duplicates++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      done++;
    }

    setProgress(
      `Done: ${done - duplicates - failed} uploaded` +
        (duplicates ? `, ${duplicates} already existed` : "") +
        (failed ? `, ${failed} failed` : "") +
        ". Processing runs in the background — watch the live view.",
    );
  }

  return (
    <section className="panel border border-white/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.2em] text-white/75 uppercase">
            Manual upload
          </h2>
          <p className="mt-1 text-sm text-white/65">
            Add photos from your computer — same processing as camera uploads.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/heic"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={progress?.startsWith("Uploading")}
          className="rounded-xl border border-white bg-transparent px-5 py-2.5 text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black disabled:opacity-40"
        >
          Select photos
        </button>
      </div>
      {progress && <p className="mt-4 text-sm text-white/75">{progress}</p>}
    </section>
  );
}
