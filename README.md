# Perks / perksp.ad

> **Implementation in progress:** The trade reward ledger and shared reservation foundation are now implemented. See [TRADE-LEDGER.md](TRADE-LEDGER.md) for scope, tests and remaining blockers, and [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) for the full plan. The holder rewards, Reloadly integration and $0.50 claim fee described below are historical details. Legacy card claims are hard-disabled. Cryptorefills is provisional; public launch requires a provider meeting the no-recipient-KYC requirement. Do not use the historical live-enablement checklist below to launch.

Next.js App Router launchpad with a working preview UI and server implementations for Pump.fun launches, indexed holder rewards, and Reloadly gift cards. The default is **explicit demo mode**. Demo numbers and vouchers are illustrative; no assets move.

## Run the preview

Requires Node 22+ and pnpm 10.30.0.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm db:generate
pnpm dev
```

Open http://localhost:3000. No credentials are needed for the demo. The page includes token search, filters, sorting, token details, wallet selection, launch form, and a holographic card redemption preview. Real wallet connection is optional in demo mode.

The new `/cards` page browses real Cryptorefills merchant cards and read-only price estimates when the catalog configuration is enabled. See [CRYPTOREFILLS-INTEGRATION.md](CRYPTOREFILLS-INTEGRATION.md). It does not create orders or spend rewards.

## Configure live services

1. Copy `.env.example` to `.env`. Set `NEXT_PUBLIC_DEMO_MODE=false`. This is a **build-time** variable; rebuild after changing it. Set both RPC URLs to the same cluster. Do not mix a mainnet wallet connection with a devnet backend.
2. Start PostgreSQL and Redis (`docker compose up -d`), then run `pnpm db:migrate`. The checked-in SQL migration creates all tables. Use an archival RPC with finalized `getBlocks` and `getBlock` access.
3. Configure Pinata, Cloudflare Turnstile, Jupiter, Reloadly OAuth, and the four Reloadly product IDs. IDs must refer to US/USD products that actually support each offered denomination; the API validates the catalog before purchase. Use Reloadly sandbox first.
4. Generate an encryption key with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Store it as `VOUCHER_ENCRYPTION_KEY` in a secret manager. Preserve it across deploys or old vouchers become unreadable.
5. Deploy and fund the included vault program as described below. Configure `PERKS_VAULT_PROGRAM_ID` and the derived `PERKS_VAULT_ADDRESS`.
6. Set `INDEXER_START_SLOT` to a finalized slot **before the first launch**. Start `pnpm worker` before enabling launches. Never advance the cursor manually past missing history. A backfill must retain every ordinary SPL transfer as well as Pump trades.
7. Configure a Helius Enhanced Transaction webhook with the exact `Authorization` value in `HELIUS_WEBHOOK_SECRET`. POST to `/api/webhooks/helius`. Watch the creator vault and relevant protocol accounts; the independent block scanner remains authoritative and does not rely on webhook ordering or delivery.
8. Schedule `pnpm orders:reconcile` every minute. Run a single indexer process. The shared PostgreSQL advisory lock and serializable transactions also protect against overlapping runs, but this reference scanner prioritizes correctness over throughput.
9. Prefund Reloadly through a funding method supported by your account. Only enable `CLAIMS_ENABLED=true` after the ledger is caught up and the provider float is sufficient. Enable `LAUNCHES_ENABLED=true` after testing the deployed PDA collection path.
10. Run `pnpm build` and `pnpm start`, or use the Dockerfile. Serve behind TLS with a 5 MB request limit, trusted proxy configuration, and edge rate limiting. Set `APP_ORIGIN` and `TURNSTILE_HOSTNAME` to your real hostname. Never use Turnstile test keys in production.

## Vault and treasury

`programs/perks-vault` is a small Solana Rust program. It derives a system-owned, zero-data PDA from `[b"perks-vault"]` and can sign collection CPIs with that PDA. The administrator is compiled into the program with `PERKS_ADMIN_PUBKEY`; there is no publicly claimable initialization step. Use the intended treasury signer (or an on-chain multisig signer via CPI).

With the Solana SBF toolchain installed, set `PERKS_ADMIN_PUBKEY`, run `cargo build-sbf --manifest-path programs/perks-vault/Cargo.toml`, deploy the resulting program, derive its PDA, and transfer enough SOL to the PDA to keep it present. Store the deployment keypair securely. Upgrade authority controls remain your operational responsibility.

The program supports:

- Pump `collect_creator_fee_v2` and Pump AMM `collect_coin_creator_fee`, restricted by program ID and discriminator.
- Unwrapping only the vault's own native SOL token account into the same vault.
- Sweeping SOL only to the compiled treasury administrator.

`lib/vault-instructions.ts` constructs these outer instructions. `pnpm treasury:collect` builds collection with the pinned official Pump SDK, wraps PDA signatures, and sweeps the previously collected SOL balance. New receipts are swept on the next daily cycle; a 0.001 SOL reserve stays in the vault. The program deliberately does not support fee-sharing configurations or arbitrary CPI methods.

`pnpm treasury:swap` converts the configured daily amount from the treasury wallet to USDC through Jupiter, with a 50 bps slippage limit and a 1% price-impact ceiling. Both workers are disabled unless `TREASURY_AUTOSWAP_ENABLED=true`. Run them from an **isolated worker environment** with `TREASURY_KEYPAIR_PATH`, daily amount, and reserve settings. Do not give the web server access to this signer. The keypair must match the compiled vault administrator for collection.

Schedule collection and swapping periodically. Each persists a unique UTC-day record and exact signed transaction before submission, then only rebroadcasts those same bytes. Subsequent runs reconcile finalized status; expired/failed daily records are not silently replaced. The swap worker spends only already-available treasury SOL and preserves its configured reserve.

**USDC conversion is not a Reloadly deposit.** No generic Reloadly crypto-funding endpoint is assumed or fabricated. Your account's supported settlement/funding rail must move the USDC proceeds into the Reloadly float; that account-specific step is not implemented here. Keep claims paused if float funding is unavailable.

## API

| Route | Purpose |
| --- | --- |
| `GET /api/tokens` | Token cards, 24-hour volume, protocol statistics; marked fixtures in demo mode |
| `POST /api/launch` | Multipart name, symbol, description, image, wallet, Turnstile token; returns mint-signed transaction with enforced PDA creator |
| `POST /api/launch/confirm` | `{mint, signature}`; verifies finalized transaction signer, mint, curve owner, and creator |
| `GET /api/rewards?wallet=…` | Eligible USD reward balance from integer ledger and finalized RPC snapshot |
| `POST /api/claims/challenge` | `{wallet, brand, amount}`; 2-minute, server-generated, branded and timestamped redemption quote |
| `POST /api/claims` | `{challengeId, signature}` (base58); atomically reserves rewards and dispatches one order |
| `POST /api/orders/challenge` | `{wallet}`; fresh private-card viewing challenge |
| `POST /api/orders` | `{nonce, signature}`; consumes challenge and returns the wallet's latest 20 private orders |
| `POST /api/webhooks/helius` | Authenticated webhook hint; never trusts webhook fee values |

Mutating browser endpoints enforce the configured Origin. Voucher responses have `Cache-Control: no-store`. The browser uses wallet `signMessage`; no wallet private key is requested. Pending launch confirmations can be rechecked without creating another token.

## Accounting rules

The spec's floating-point `balance × (index − checkpoint)` formula would overpay wallets that buy after fees accrued if balances are sampled only at claim time. This implementation uses exact `Decimal(78,0)` database integers and BigInt math with a `10^18` index scale.

The indexer reads finalized blocks in canonical order. Authenticated Pump and canonical SOL-paired Pump AMM events identify the token and creator fee. It does not guess a token from a shared-vault deposit. It credits each transaction's fees to **pre-transaction balances**, settles balances changed by that transaction, then installs the post-transaction balances at the new index. Thus a new buyer receives future fees, while a seller retains previously earned rewards. Mint/burn supply changes are included. Total token supply is the denominator, as requested; uncirculating curve inventory is not reassigned to holders. Per-wallet fractional lamports carry forward; global index-division dust remains unallocated.

The claim endpoint requires a fresh indexer cursor and reads both classic SPL and Token-2022 accounts at a finalized RPC context. Checkpoint balances must match the current RPC snapshot. Zero-balance positions are ineligible. This is a point-in-time check, not an on-chain token escrow: a holder can transfer after the snapshot. Preventing that requires staking/escrow, outside the supplied claim model.

The quote includes the selected amount, brand, $0.50 service fee, exact lamport debit, origin, wallet, timestamp, and expiry. Amounts below $5 and unsupported denominations are rejected. Price data must be close to the current confirmed Solana slot. Claims reserve only the selected amount plus service fee; the remainder is preserved. The displayed gift-card pot is cumulative indexed creator fees, not a statement of prefunded Reloadly cash.

## Idempotency and recovery

PostgreSQL is the authority; Redis supplies rate limits and a token-owned wallet mutex. A unique challenge/order relation and a compare-and-set `RESERVED → SUBMITTING` transition make provider POST dispatch at-most-once even if the Redis lease expires. Each order has one cryptographically random `perks_claim_<UUID>` identifier, reused forever.

Reloadly timeouts, 5xx responses, malformed responses, and process termination after dispatch remain `SUBMITTING` or `RECONCILING`, with the reward reservation retained. **A UUID alone is not treated as a provider exactly-once guarantee.** Reconciliation queries by provider transaction ID or exact `customIdentifier`; a missing search result never permits another POST. A crash immediately before a provider request can therefore require operator resolution. This favors no double purchase over automatic availability.

Successful cards are fetched from the transaction cards endpoint and encrypted with AES-256-GCM before storage. Provider response bodies, credentials, signatures, and codes are not logged. Fresh wallet proofs recover cards after reconnecting.

An operator may run `pnpm orders:refund ORDER_ID --provider-refund-verified` only after verifying the provider actually refunded a failed order. The script also requires the provider's definitive `FAILED` status, checks the persisted debit allocation audit, and restores rewards transactionally once. Unknown outcomes and delivered cards are never automatically refunded. Keep an audit of operator actions and investigate long-running reservations.

## Validation and remaining deployment work

```sh
pnpm typecheck
pnpm test
pnpm build
```

The implementation was checked with TypeScript, a Next.js production build, and nine unit/failure-path tests covering transferred reward ownership, rounding, partial claims, the minimum and service fee, signature tampering, encryption, and concurrent/uncertain provider dispatch. Demo interactions were exercised in the browser.

No live purchases, funded swaps, or on-chain launches were performed. Docker's engine was unavailable in the build environment, so PostgreSQL/Redis integration tests were not run. Rust/Solana tooling was not installed, so the vault source was **not compiled or deployed**. Before enabling real funds, compile and exercise the vault on a local validator/devnet, test create/collect/unwrap/sweep against the target Pump deployment, test DB concurrency and process termination recovery, and verify the Reloadly account's response/status/catalog behavior in its sandbox. The Rust source and reference indexer require review and load testing for production throughput.

## Integration references

- [Pump official SDK](https://github.com/pump-fun/pump-sdk) (pinned to 2.0.0)
- [Pump creator collection](https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/COLLECT_CREATOR_FEE.md)
- [Reloadly gift-card API](https://docs.reloadly.com/gift-cards)
- [Cloudflare server-side Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Jupiter swap API](https://developers.jup.ag/docs/api-reference/swap/v1/swap)
