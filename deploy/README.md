# Perks production deployment

For the currently selected Vercel + PC-worker setup, use [VERCEL-PC.md](VERCEL-PC.md).
The user declined Cloudflare; no tunnel or DNS change is part of that setup.

Prepared for perksp.ad. This is an optional complete single-server deployment; it does not
change Namecheap DNS or the existing Vercel deployment by itself. Vercel can
continue serving the site while this server is prepared. Do not point Vercel
at the PC's localhost database or expose raw PostgreSQL/Redis ports publicly.

## Current production findings (2026-09-20)

- Homepage responds 200 from Vercel.
- `/api/tokens` responds 500.
- `/api/launch/status` reports disabled, no reward policy, no pilot restriction.
- Local settings are different from production; local PostgreSQL/Redis work.

## Server setup

Use a Linux server with Docker Engine and Compose v2, persistent disk, and
enough memory for the Next.js build (start with 4 GB plus swap or build elsewhere).
Allow inbound HTTPS/HTTP; restrict SSH to the operator. Database and Redis have
no host ports in this Compose file. Keep DNS direct to the server for this
Caddy configuration; CDN proxying requires explicit trusted-proxy configuration.

1. Run `node deploy/prepare-env.cjs` on the existing PC to create the ignored
   `.env.production` from selected local settings. It preserves the encryption
   key, reward policy and start slot, but pauses launches/payments. Set real
   Turnstile production keys for perksp.ad. Do not use test keys.
2. Transfer the repository and `.env.production` securely to the server.
   Never commit environment files, wallet keypairs or database backups.
3. Build with:
   `docker compose --env-file .env.production -f docker-compose.production.yml build web`
4. Start only storage first:
   `docker compose --env-file .env.production -f docker-compose.production.yml up -d postgres redis`
5. Complete the migration below BEFORE starting the application/indexer.
6. Start the services:
   `docker compose --env-file .env.production -f docker-compose.production.yml up -d`
   Migrations complete before the web app and indexer start. Caddy obtains HTTPS
   certificates once DNS resolves to this server and ports 80/443 are reachable.
7. Verify web/API access on the server before switching DNS (for example use
   an SSH tunnel). Then set Namecheap DNS for perksp.ad to the server IP. Preserve
   mail and other unrelated DNS records. Keep the old Vercel records for rollback.

Public Next.js settings are compiled into the image. Changing RPC, network,
Turnstile site key or demo mode requires rebuilding the image.

## Preserve the existing ledger

During final cutover, pause new launches/checkouts and stop the LOCAL indexer
and card worker gracefully. Resolve or preserve pending transactions; do not
delete reservations or issue replacement payments. Never run independent copies
of the ledger while both are accepting activity.

Create a PostgreSQL custom-format backup from the existing `perks-local`
container using `pg_dump -U perks -d perks -Fc`. On Windows, write the dump inside
the container and `docker cp` it out; avoid binary redirection through older
PowerShell versions. Transfer it securely. Restore into the new, EMPTY production
database with `pg_restore --exit-on-error --no-owner --no-acl -U perks -d perks`.
Do not use `--clean` on a populated database. Compare table counts, reward totals,
the `trade-v1` policy and the `solana` cursor before starting the indexer.

Preserve `VOUCHER_ENCRYPTION_KEY`, treasury address, payment signer and existing
reward policy exactly. Never reset `INDEXER_START_SLOT`/cursor to the current tip.
Redis contains one-use proofs and prepared launch messages. Drain pending launch
flows or migrate Redis too before cutover; otherwise those requests must be
re-authorized. Do not discard already-broadcast launch confirmation information.

## Payments

The cards worker is an opt-in Compose profile, because it can process real orders.
Securely transfer the EXISTING payment signer to
`deploy/secrets/card-payment-wallet.json`. Only the cards container receives it.
Set permissions so container UID 1000 can read it; keep parent directories private.
Create `deploy/secrets/card-worker.json` containing `{}` if no treasury signer is
configured. The payment key path is supplied via a Docker secret. If automatic
refills need an existing treasury signer, explicitly configure and mount that
signer only in the cards worker; never add it to the web image or environment.

When migration and payment checks are complete, start with:
`docker compose --env-file .env.production -f docker-compose.production.yml --profile cards up -d`

`CARD_REDEMPTIONS_ENABLED=false` blocks new checkout, but a running worker may
still reconcile/pay existing queued orders. Do not start it on copied data while
the old payment worker is active. Check the configured payment wallet has funds.
The UI hides checkout when its heartbeat is stale or its reported balance is zero.

## Public launch acceptance

Set production Turnstile secret/site key/hostname, verify mainnet on both RPCs,
ensure the policy matches the migrated ledger, and wait for the indexer to catch up.
Then set `LAUNCHES_ENABLED=true` with an empty `PILOT_LAUNCH_WALLET`.
Enable catalog/payment/collection flags only after the corresponding services are
configured and verified. Leave retired `CLAIMS_ENABLED` and
`TREASURY_AUTOSWAP_ENABLED` false.

Use a second compatible wallet on the public domain to test launch, Pump buy/sell,
reward attribution, collection, redemption, reconnect recovery and worker restart.
The user must approve funded wallet transactions. Passing a build/health check
does not establish that real launch/payment flows work.

## Operations

- `docker compose --env-file .env.production -f docker-compose.production.yml ps`
- `docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=50 web indexer`
- `/api/health`: database/Redis reachability; does not certify funds or launch readiness.
- `/api/launch/status`: launch gating and indexer freshness.
- `sh deploy/backup.sh`: database backup; schedule daily and copy encrypted backups
  off the server. Back up the encryption key and signer separately. Test restoration.
- Docker restarts exited processes; an unhealthy flag alone does not restart them.
  Monitor indexer/payment health and disk usage externally; investigate before replay.
- Never use `docker compose down -v`; it deletes persistent data.

References: [Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/),
[Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy),
[Next.js build-time public variables](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/environment-variables.mdx).
