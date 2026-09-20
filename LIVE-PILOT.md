# Perks live pilot readiness

Updated September 19, 2026. User requests an actual Pump launch, their own wallet's buy/sell test, real feed and wallet rewards, then gift-card redemption. No transactions or paid services were initiated in this audit.

## Current verified boundaries

### Latest local verification

### September 19 — collection and targeted indexing implementation

- Replaced the continuous whole-chain download loop with paginated history discovery on the shared treasury, curve creator vault and AMM WSOL vault ATA. Pending launches additionally watch mint/curve/pool addresses until activation. Captures a finalized tip before watch-list discovery, deduplicates activity slots, downloads those blocks in canonical order, and stops on pagination budget exhaustion or missing blocks. This is supported single-recipient SOL fee-path coverage, not universal external-router beneficiary attribution. Non-trading holder transfers are not fully covered, so targeted-mode holder counts are null rather than fabricated.
- Added standalone collection proof checks against authenticated program events, allowed instruction/account layouts, source debits and actual treasury SOL receipt. AMM fees must be unwrapped into treasury SOL. Mixed transactions or unsupported collection paths stop indexing pending review. Funding runs inside canonical block processing, permitting already-indexed earlier transactions in the same slot; replay cannot fund a receipt twice. Unmatched received fees remain separate from allocated fee amounts.
- `/treasury` now displays real treasury SOL and aggregate pending/available/reserved rewards. Browser-verified live response shows the configured treasury and zero balances, with indexer not started. `/api/treasury/collect` only prepares/simulates an unsigned owner-approved transaction and remains disabled; no collection was broadcast. Native wallet client network still needs configuration before any signing.
- Homepage and reward modal refresh in live mode. Market snapshots and SOL pricing/finality calls share short per-process caches. Missing USD prices display unavailable instead of invented dollar amounts. Reward balance retains SOL. Corrected holder-based marketing and changed fee-pot wording. Development Prisma client now refreshes when local DB configuration changes; Redis requests wait briefly for initial connection.
- Launch confirmation now requires the actual authenticated creation event, matching metadata, user, treasury, SOL quote and disabled cashback/holder/mayhem modes. Launch endpoint additionally requires a reward policy, fresh indexer and mainnet configuration.
- TypeScript passed; 30 tests passed, including real PostgreSQL tests and curve/AMM receipt checks. Three read-only Helius account-history probes passed. No actual Pump launch/trade/collection fixture from the pilot exists yet; scanner/receipt tests are not a funded end-to-end proof.
- `INDEXER_MODE=targeted`, lag threshold 150 slots, and `COLLECTIONS_ENABLED=false` saved locally. `REWARD_BPS` and start slot remain unconfigured; scanner is not running. Demo mode remains on until live setup is complete. No paid orders, transfers or subscriptions.

### Revised RPC estimate

Current official Helius credit docs list `getSignaturesForAddress`, `getBlock` and standard RPC calls at **1 credit**, not 10: https://www.helius.dev/docs/billing/credits . With no pending launches, one tip plus three history requests every 15 seconds is approximately 691,200 requests per 30 days before network/processing delays. Add pagination, activity blocks, market reads, wallet reads, retries and recovery. Each pending launch adds three watched addresses until activation. This is a calculated baseline, not measured monthly usage or proof that every traffic level fits a plan. Keep the $49/10M-credit target provisional until activity testing.

### Native SOL card payment finding

Read-only Cryptorefills `/v3/payment_vias` returned unsuspended SOL on Solana. `/v4/products/price` for Amazon.com US $5 with `coin=SOL` returned HTTP 200 and `coin_amount=0.046783` at observation time. No order was created. Direct SOL is a promising replacement for a conversion-funded USDC payment path, but validation, actual order schemas, all-in cost policy, signed authorization, payment persistence, delivery/recovery and paid testing remain unfinished. Current catalog adapter still quotes USDC; the probe did not silently change checkout behavior.

### Outstanding user input

Asked for the first token's name, ticker and description; awaiting reply. Artwork, exact test spending/initial-buy amounts, approved reward fraction, metadata upload credentials and production anti-abuse setup still need resolution. Do not enable launch just because RPC/database checks pass.

Docker engine recovered after both stale socket directories were preserved together with Docker stopped. Engine reports 29.1.3. `docker compose -p perks-local up -d postgres redis` created isolated project volumes and localhost-only containers. No existing volumes were reset.

Created separate local `perks` development and `perks_test` disposable test databases. Both migrations applied successfully to both. Local database/Redis URLs are configured in ignored `.env.local`. All 24 tests passed, including PostgreSQL collection replay, sold-out-wallet entitlement, competing reservations, uncertain payment and constraint checks; none skipped. All five readiness checks passed (disabled live switches, treasury, mainnet RPC, database schema, Redis). These checks do not establish live collection or fulfillment readiness. Earlier database/Docker blockers below are historical and resolved.

Local services can be restarted with `docker compose -p perks-local up -d postgres redis`. Do not use `down -v`, which deletes data. For host Node versions without wildcard expansion, enumerate compiled test files in PowerShell and pass their paths to `node --test`; set `TEST_DATABASE_URL` to the disposable local database only.

- Wallet custody is now explicit in configuration. Launch building, confirmation recipient checks and reward indexing use the configured treasury; legacy PDA helpers reject wallet mode. This does not implement collection verification or payment signing. Local launches, claims and autoswap remain disabled. TypeScript and 23 unit/regression tests passed; PostgreSQL integration still awaits a running database.
- `node workers/readiness.cjs` provides sanitized read-only RPC/treasury/database/Redis checks. Mainnet and treasury checks passed; database and Redis are not configured yet.
- Docker Desktop 4.55.0 startup encountered inaccessible stale sockets. Preserved the socket-only `Docker/run` and `docker-secrets-engine` directories under timestamped sibling backup names and recreated empty directories. No factory reset, volume deletion or credential reads. Engine recovery is still being verified.

- Helius free account connected: server-only `SOLANA_RPC_URL` saved in ignored `.env.local`. Read-only RPC returned finalized slot and mainnet genesis hash `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d`. No keys recorded in this document, paid upgrades, or transaction submissions. Network access for local probes required sandbox escalation.

- Cryptorefills partner/catalog settings are also configured locally. Database, Redis and other service connectivity remain unverified.
- Launch builder exists, disables cashback/holder rewards/mayhem, but requires the custom Perks vault PDA. Initial buy and stronger transaction/event verification remain unfinished.
- Included vault program is source code, not a verified deployment. Existing collection/swap workers must stay disabled: collection does not fund the new reward ledger and the old sweeping behavior ignores its liabilities.
- Trade-attributed ledger and reservations exist; PostgreSQL concurrency tests remain unexecuted. Finalized collection verification has no caller.
- Homepage fetches once; reward modal fetches on opening. Neither is a continuously updating live experience yet. Demo defaults on.
- Cryptorefills catalog and price GET requests work. Recipient entry, purchase authorization, order creation, payment, delivery and reconciliation are not implemented.

## Recommended pilot custody

Use a separate dedicated treasury wallet as the creator-fee recipient, with explicit owner wallet signing for collections/payments during the pilot. User trading wallet stays separate. This is a proposed simplification, not the current implementation: launch, verification, indexing and collection code must be adapted and tested together before using it.

Pump's documented single-recipient collection instructions pay the configured creator wallet; collection is permissionless. A custom program is therefore not required merely to receive fees. Curve and AMM collection paths are separate. Shared fee configurations require a different distribution path.

Wallet custody is operator-controlled, not trustless escrow. Later unattended payouts need an isolated limited-balance signer and reserve reconciliation; do not place treasury secrets in browser code or the web-server environment. Never request a seed/private key in chat. Do not launch against a temporary fee recipient that will require an assumed later change.

Source: https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/COLLECT_CREATOR_FEE.md

## Required inputs, collected one at a time

Confirmed launch/test-trading wallet: `FqrpVRn3bsu56xG4xRpVySt37CHzRC1mNipL1LbTEeho`. This identifies the pilot trader whose rewards are tracked; it is not the treasury destination and must not restrict rewards for other eligible wallets. User requires the shared creator-fee destination and reward funding path to be complete before enabling launches.

Confirmed dedicated treasury destination: `Ck1GCSBQZgup9mZJkZ3wT8HqZdRk8uiTSgFje5KxYpLK`. User supplied this address to receive creator funds from all Perks launches. Public-key validation does not establish ownership; signing is still required for treasury spending. Recorded as intended configuration only: existing PDA-dependent runtime has not been switched or enabled. Do not simply substitute this address into `PERKS_VAULT_ADDRESS` without adapting and verifying launch, collection and accounting together.

1. Public address of launch/test trading wallet. User signs in their wallet.
2. Public address of dedicated treasury wallet, controlled by user; decide wallet-signed pilot custody before setting immutable/long-lived launch configuration.
3. Confirm a specific total pilot spending cap and initial-buy amount before transactions. The earlier approximate $100 is not transaction authorization.
4. Token name, ticker, description and artwork; confirm public launch versus a disposable publicly visible test token.
5. Mainnet RPC with required transaction/block history, development PostgreSQL and Redis, metadata storage, and launch anti-abuse configuration. Enter credentials locally, not in chat. Local database/Redis may avoid hosting charges during development; verify availability first.
6. Explicit pilot reward fraction after cost checks; no arbitrary live default. Fix it before first eligible indexed trade.
7. Recipient email and chosen merchant card for paid fulfillment test. Existing Cryptorefills catalog integration is reused.

## Work order and acceptance

### RPC cost constraint

User requires an affordable paid upgrade path. Helius verified pricing on September 19, 2026: Free $0/1M monthly credits; Developer $49/10M; Business $499/100M. Mainnet gRPC requires Business or above; do not make it a dependency of this budgeted pilot. Source: https://www.helius.dev/docs/billing/plans

Current `workers/indexer.ts` downloads every finalized block, even when no Perks token trades. Replace this before sustained mainnet operation with targeted relevant-account/transaction discovery plus durable backfill and reconciliation. Prove coverage against supported curve/AMM routes; never sacrifice reward completeness silently to reduce cost. Cache shared market snapshots rather than multiplying upstream calls by website visitors. Measure credit consumption and project a month of representative activity before recommending payment. Keep optional auto-purchases disabled; pause affected features with explicit stale/pending states if limits prevent trustworthy accounting. $49/month is a potential RPC budget, not a validated total operating cost or authorization to subscribe.

1. Establish development DB/Redis and run migration + concurrency tests. Validate config without printing secrets.
2. Implement chosen treasury destination consistently. Validate current SDK against official instructions and simulate launch/collection. Add initial-buy quote if requested and bind confirmation to the actual launch event and modes.
3. Implement finalized receipt verification, ordering, attribution, restart/backfill and reconciliation. Do not promote pending to available from trade logs alone. Disable obsolete financial workers.
4. Add recurring feed and wallet refresh, pending/available SOL with estimated USD, per-token trade contribution, and freshness/error states. Correct holder-based marketing. Live mode must never fall back to sample tokens or balances.
5. Wire card email/review, server quote and cost coverage, wallet-authorized shared reservation, persisted order/payment identity, signing and confirmed delivery. Recover uncertain outcomes without duplicate payment or premature release. Treat provider payment network/address as validated order data, never infer them from catalog labels.
6. User launches from Perks. Verify transaction, mint, creator recipient and listing. User executes a small buy/sell; confirm their exact event fees, pending rewards and sold-out wallet eligibility. Collect fees; prove funded balance matches the ledger and chain.
7. Redeem using the real funded balance and verify debit, payment and delivery. If the small trading test does not earn a card minimum, test paid provider delivery with separately recorded operator funding; do not mislabel that as earned rewards or claim it proves the all-earned end-to-end path.

One buy/sell smoke test need not earn a full gift card. Repeated self-trades incur costs; reward accounting should be validated with small amounts rather than assuming those trades finance testing. All-earned card redemption is a separate acceptance condition until actual accrued funds suffice.

Source for provider lifecycle: https://www.cryptorefills.com/en/api-docs/developers

## Completion means

A real on-chain launch appears without sample data; the actual trader receives the correct attributable balance; receipts fund it; a card or SOL reservation cannot double spend it; an authorized payment settles once; delivery/withdrawal is recoverable and reflected in the remaining balance. A working modal or successful catalog request alone does not meet this definition.
