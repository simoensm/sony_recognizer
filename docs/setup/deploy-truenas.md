# Deploying to your TrueNAS (free, via Cloudflare Tunnel)

Result: `https://app.yourdomain.com` works from any phone anywhere;
photos live on your NAS; €0/month. Requires TrueNAS SCALE 24.10+
(native Docker) and a domain you own.

> Status note: this is a **staging** deployment — friends-and-family
> events. Before paid/public events we complete M3 (erasure flows, DPIA,
> commercial model weights — docs/design/07).

## 1. Put your domain on Cloudflare (free plan)

1. https://dash.cloudflare.com → Add site → your domain → Free plan.
2. At your registrar, replace the nameservers with the two Cloudflare
   gives you (takes minutes to a few hours).

## 2. Create the tunnel

1. Cloudflare dashboard → Zero Trust → Networks → Tunnels → **Create tunnel**
   (Cloudflared type) → name it `sonyrec`.
2. Copy the **token** from the install command it shows (the long string
   after `--token`) → this goes in `.env.production`.
3. Under the tunnel's **Public Hostnames**, add TWO routes:
   | Hostname | Service |
   |---|---|
   | `app.yourdomain.com` | `http://web:3000` |
   | `s3.yourdomain.com`  | `http://minio:9000` |

   (Service names work because cloudflared runs inside the same Docker
   network as the app.)

## 3. Get the code onto the NAS

SSH in (TrueNAS UI → System → Shell, or `ssh admin@<nas-ip>`):

```bash
git clone https://github.com/<you>/sony_recognizer.git
cd sony_recognizer
cp .env.production.example .env.production
nano .env.production        # fill EVERY value — generation commands are inline
```

Note: `pnpm-lock.yaml` must be committed on your Mac first
(`git add pnpm-lock.yaml && git commit -m "chore: lockfile" && git push`) —
the Docker builds require it.

## 4. Build and start

```bash
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d --build
```

First build takes a while (the worker image installs the ML stack).
Check status / logs:

```bash
docker compose -f docker/docker-compose.prod.yml ps
docker compose -f docker/docker-compose.prod.yml logs -f web worker ingest
```

`migrate` runs once and exits — that's it applying the database schema.

## 5. Verify

- `https://app.yourdomain.com/api/v1/health` → `database: ok`
- Sign up (this is your fresh production account), create an event —
  the QR now encodes your real domain. Scan it with your phone on
  **mobile data** (not Wi-Fi) — that's the real internet-facing test.

## 6. The camera

- **At home**: point the camera at the NAS LAN IP, port 2121 — same as dev.
- **At a venue**: the camera can't reach your home FTP through the tunnel
  (FTP isn't HTTP). Options, in order of practicality:
  1. Forward port 2121 + 30000-30009 on your router to the NAS and point
     the camera at your public IP/DDNS name. ⚠ Do this only after we add
     FTPS (TLS) to ingest — plain FTP over the internet sends the password
     and photos unencrypted. Next work item.
  2. Bring a laptop running the ingest service at the venue (camera →
     laptop over a phone hotspot, laptop → home over the internet).

## Updating after code changes

```bash
cd sony_recognizer && git pull
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d --build
```

## Troubleshooting

| Symptom | Check |
|---|---|
| Domain doesn't resolve | Nameserver switch still propagating; tunnel healthy in Cloudflare UI? |
| App loads, images broken | `S3_PUBLIC_ENDPOINT` must be `https://s3.yourdomain.com` and that hostname routed to `http://minio:9000` in the tunnel |
| Sign-in fails | `APP_URL` must exactly match the URL in the browser (https, no trailing slash) |
| Build fails on lockfile | Commit `pnpm-lock.yaml` from your Mac and `git pull` on the NAS |
| Worker slow first photo | One-time model download into the `models` volume |
