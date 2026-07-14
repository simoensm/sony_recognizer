# M2 — Testing the attendee flow (QR → selfie → gallery)

## 1. Update everything

```bash
cd ~/Documents/GitHub/sony_recognizer
pnpm install                       # qrcode library
pnpm db:migrate                    # name it: enrollment_status

cd apps/worker && source .venv/bin/activate
pip install -e ".[ml]"             # picks up pillow-heif (iPhone selfies)
cd ../..
```

## 2. Make the site reachable from your phone

Your phone can't open "localhost" — that's the Mac itself. Use the LAN IP
(same one as `FTP_PASV_HOST`). In `.env`:

```
BETTER_AUTH_URL=http://192.168.68.80:3000     ← your IP
NEXT_PUBLIC_APP_URL=http://192.168.68.80:3000
```

## 3. Restart all three services

```bash
pnpm --filter @sr/web dev          # tab 1
pnpm --filter @sr/ingest dev       # tab 2
# tab 3: apps/worker → source .venv/bin/activate && python -m worker.main
```

## 4. The end-to-end test

1. On the Mac: open `http://<your-ip>:3000` → dashboard → your event.
   New panel: **Attendee QR code**.
2. Photograph a friend (or yourself) with the camera → wait for
   "processed" in the live view.
3. **On your phone**: scan the QR from the screen → consent → selfie.
4. A few seconds of "Finding your photos…" → the personal gallery appears
   with exactly the photos that person is in.
5. Keep shooting — new photos of them appear in their gallery within
   ~10 seconds, automatically.

## What to look for

- A selfie with no/multiple faces gets a clear retake message (quality gate).
- Someone NOT in any photo gets an empty gallery — never someone else's photos.
- The dashboard participant count ticks up after each join.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Phone can't open the page | Wrong IP in NEXT_PUBLIC_APP_URL, or phone on other network/VPN |
| Sign-in/consent fails on phone | BETTER_AUTH_URL must ALSO be the LAN IP (cookies are origin-bound); restart web |
| Stuck on "Finding your photos…" | Worker tab not running, or crashed — check tab 3 |
| "no_face" on a good selfie | Poor light; try near a window, camera at eye level |
| Gallery empty but photos exist | Check worker logs for match scores — thresholds may need tuning for your lighting; tell me |
