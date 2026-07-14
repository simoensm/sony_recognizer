/** Personal gallery — only photos this participant was matched in. */
import { notFound, redirect } from "next/navigation";
import { getGallery } from "@sr/core";
import { getSession } from "@/lib/session";
import { GalleryView } from "@/components/attendee/GalleryView";

export const dynamic = "force-dynamic";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { participantId } = await params;
  const gallery = await getGallery(session.user.id, participantId);
  if (!gallery) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm tracking-widest text-emerald-400 uppercase">Your photos</p>
      <h1 className="mt-1 text-2xl font-bold">{gallery.event.name}</h1>
      <GalleryView participantId={participantId} initialCount={gallery.photos.length} />
    </main>
  );
}
