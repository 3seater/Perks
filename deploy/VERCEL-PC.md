# Vercel website with workers on this PC

The user chose to keep the PC running and declined Cloudflare. Use Vercel for
the web app, shared online Postgres/Redis for state, and outbound-only Docker
workers on the PC. No tunnel, router port forwarding, DNS changes or new VPS
are required. Local Docker PostgreSQL/Redis remain development services.

## Setup sequence

1. Provision shared Postgres (Neon) and Redis via Vercel's Storage integrations,
   selecting free plans if adequate. Account/terms approval belongs to the user;
   do not silently enable paid plans. Keep database region close to Vercel.
2. Obtain connection strings securely. Use TLS. Use the provider's direct
   Postgres endpoint for migration and persistent workers; a pooled endpoint
   can be used by the website. All must address the same production database.
3. Pause new local launches/checkouts, let in-flight operations settle, and stop
   old workers gracefully. Back up the existing ledger and restore into the EMPTY
   shared database; preserve the cursor, reward policy, encryption key and signer.
   Validate counts and balances before starting the new workers. See README.md
   for the migration precautions. Do not discard already-signed launch state.
4. Create ignored `.env.workers` with the shared DATABASE_URL/REDIS_URL and
   relevant server settings copied from `.env.local`. Keep all feature switches
   paused during migration. Do not reset INDEXER_START_SLOT or the database cursor.
5. Set matching server configuration in Vercel. Configure APP_ORIGIN to the
   actual canonical domain, `https://www.perksp.ad`, mainnet on both RPCs, demo
   off, the existing treasury/reward rate, and real Turnstile keys/hostname.
   Never upload payment or treasury private keys to Vercel.
6. Start Docker's indexer after stopping the old one:
   `docker compose --env-file .env.workers -f docker-compose.workers.yml up -d --build`
7. For cards, preserve the existing payment signer. Create
   `deploy/secrets/card-worker.json` containing `{}` when no treasury signer is
   configured. The worker-only Docker secret supplies the payment key. Enable
   the cards profile only after checking migrated pending orders and funding:
   `docker compose --env-file .env.workers -f docker-compose.workers.yml --profile cards up -d`
8. Wait for a fresh indexer, configure public Turnstile, remove the pilot restriction
   and enable launches. Enable card checkout/collection only after their checks.
   Rebuild/redeploy Vercel after changing NEXT_PUBLIC variables.

## Verification

- `/api/health` must pass on the PUBLIC site (shared database and Redis).
- `/api/tokens` must return real data or an honestly empty live listing.
- `/api/launch/status` must report enabled and pilot=false before public launches.
- Test a second wallet's launch, Pump buy/sell, credited rewards, collection and
  a real card redemption/recovery. User-approved transactions remain necessary.
- Restart workers and check cursor/reconciliation recovery; no duplicate payment.
- Keep Docker Desktop/PC awake. A running UI does not mean workers are healthy.
- Back up the shared database, encryption key and signer. Test restoring backups.
- Track provider storage/compute/command limits; free tiers are not capacity proof.

The current local card worker may reconcile/pay existing orders even while new
checkout is disabled. Never run the old and new copies against diverging ledgers.
Docker restart policies handle process exits; monitor failed/stale health checks.
