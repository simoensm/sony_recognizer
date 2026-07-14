# Deploying to a VPS (DigitalOcean via GitHub Student Pack)

Same stack, same compose file as the TrueNAS guide — only the machine
changes. Result: `https://app.yourdomain.com` live on the internet,
paid for by student credit.

## 0. Get the credit (one-time, ~15 min)

1. https://education.github.com/pack → "Get student benefits" → verify
   with your student email / proof of enrollment.
2. Once approved, open the **DigitalOcean** offer in the pack and follow
   its link to create your DO account — the $200 credit (12 months)
   attaches automatically.

## 1. Create the server (droplet)

DigitalOcean dashboard → Create → Droplet:

- **Region**: Frankfurt or Amsterdam (EU — our GDPR posture, docs/design/06 §3)
- **Image**: Marketplace tab → **Docker on Ubuntu** (Docker preinstalled)
- **Size**: Basic → Regular → **4 GB RAM / 2 vCPU (~$24/mo ≈ 8 months of credit)**
  (the AI worker wants ~2 GB for its models; resize up later if needed)
- **Authentication**: SSH key if you have one, otherwise password
- Create. Note the droplet's public IP.

## 2. DNS — two records at your registrar (existing website untouched)

At your registrar's DNS settings (e.g. one.com → your domain → DNS),
ADD two records (change nothing else — your main site keeps working):

| Type | Name (subdomain) | Value |
|---|---|---|
| A | `sony` | `<droplet-ip>` |
| A | `sony-photos` | `<droplet-ip>` |

Result: `sony.abovebelgium.be` (the app) and `sony-photos.abovebelgium.be`
(photo delivery) point at your server. HTTPS certificates are obtained
automatically by the Caddy container on first start — no Cloudflare
account needed for this route. (The Cloudflare-tunnel alternative from
the TrueNAS guide still exists behind `--profile tunnel` for NAT-bound
hosts.)

## 3. Deploy

```bash
ssh root@<droplet-ip>

git clone https://github.com/<you>/sony_recognizer.git
cd sony_recognizer
cp .env.production.example .env.production
nano .env.production
```

Fill everything (generation commands are inline). VPS-specific values:

```
APP_HOST=sony.abovebelgium.be
S3_HOST=sony-photos.abovebelgium.be
APP_URL=https://sony.abovebelgium.be
S3_PUBLIC_ENDPOINT=https://sony-photos.abovebelgium.be
FTP_PASV_HOST=<droplet-public-ip>
```

Then (the `direct` profile starts Caddy, the HTTPS entrance):

```bash
docker compose -f docker/docker-compose.prod.yml --env-file .env.production --profile direct up -d --build
docker compose -f docker/docker-compose.prod.yml logs -f caddy web worker
```

## 4. Verify

- `https://sony.abovebelgium.be/api/v1/health` → `database: ok`
  (give DNS + certificates a few minutes on first start)
- Sign up, create an event, scan the QR with your phone **on mobile data**,
  selfie, gallery. That's the product, live on the internet.

## 5. Camera

A VPS has a public IP, so the camera can reach it from any venue with
internet (phone hotspot works): FTP server `<droplet-ip>`, port 2121,
passive on. **But**: plain FTP over the internet is unencrypted (password
+ photos readable in transit). Acceptable for a quick technical test;
NOT for a real event — FTPS (TLS) in the ingest service is the next work
item, and the A7III supports it.

The DO firewall (Networking → Firewalls) should allow: 22 (SSH),
80 + 443 (web/HTTPS via Caddy), 2121 + 30000–30009 (camera FTP).

## Updating

```bash
cd sony_recognizer && git pull
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d --build
```

## Cost watch

$24/mo against $200 credit ≈ 8 months. Set a billing alert in DO
(Settings → Billing) so the end of the credit never surprises you.
Destroying the droplet stops all charges (photos die with it — export first).
