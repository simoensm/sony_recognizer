# M1 — Testing the camera pipeline (Sony A7III → faces in database)

## 1. Install the new dependencies

```bash
cd ~/Documents/GitHub/sony_recognizer
pnpm install

# Python worker (one-time setup)
cd apps/worker
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[ml]"        # ~2 GB: AI runtime + models tooling
cd ../..
```

## 2. Prepare the database & credentials

```bash
pnpm db:migrate      # applies the vector-index migration
pnpm db:seed         # prints your camera's FTP login — COPY THE PASSWORD
ipconfig getifaddr en0   # your Mac's Wi-Fi IP — you'll need it twice below
```

Edit `.env`: set `FTP_PASV_HOST=<that IP>`.

## 3. Start the three services (three terminal tabs)

```bash
# tab 1 — FTP receiver
pnpm --filter @sr/ingest dev

# tab 2 — AI worker (first run downloads ~300 MB of face models)
cd apps/worker && source .venv/bin/activate && python -m worker.main

# tab 3 — web app (optional for this test)
pnpm --filter @sr/web dev
```

macOS will ask "allow node to accept incoming connections?" → **Allow**.

## 4. Configure the camera (A7III)

Camera and Mac must be on the **same Wi-Fi network**.

MENU → Network → **FTP Transfer Func.**
- FTP Function: **On**
- FTP Server: Server 1 → edit:
  - Destination Server / Host name: **your Mac's IP**
  - Secure protocol: **Off** (dev only — production uses FTPS)
  - Port: **2121**
  - Passive mode: **On**
  - User name / Password: from the seed output
- FTP Auto Transfer: **On** (uploads every shot as you take it)

Older firmware hides FTP under Network → "Transfer/Remote". If "FTP
Transfer Func." is missing entirely, update the camera firmware.

## 5. Shoot & verify

Take a photo of a person. Within seconds, in order:
1. Ingest tab logs `✓ DSC0xxxx.JPG → photo <id>`
2. Worker tab logs `photo <id>: N faces detected, N usable`
3. Verify in the database: `pnpm db:studio` → open the **faces** table
4. Verify variants: http://localhost:9001 (minioadmin/minioadmin) →
   photos bucket → …/variants/

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Camera says "connection failed" | Wrong IP, different Wi-Fi network, or macOS firewall blocked node |
| Camera connects, upload hangs | `FTP_PASV_HOST` in `.env` is not your LAN IP, or passive ports 30000-30009 blocked |
| Rejected login | Password typo (re-run `pnpm db:seed` for a fresh one) |
| Worker crash on first photo | Model download interrupted — rerun, it resumes |
| `duplicate — skipped` in ingest logs | Normal: the camera re-sent a file it already uploaded |
