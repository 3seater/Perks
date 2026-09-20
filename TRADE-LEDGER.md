# Trade reward ledger — September 19, 2026

Latest verification: local PostgreSQL and Redis are running under Docker project `perks-local`. Both migrations were applied to fresh development and separate disposable test databases. The PostgreSQL integration test described below now passes; full suite 24 passed, 0 failed, 0 skipped. Previous Docker/database blockers below are historical. Live chain collection, withdrawals and paid card delivery remain unfinished.

This is the first backend implementation stage, not a live payout system. No money was moved and no live database was migrated.

## Implemented

- Finalized Pump curve and canonical Pump AMM events create independently identified reward lots. Buys and sells earn a configured fraction of that event's creator fee. Holder checkpoints remain market data only.
- Attribution uses the authenticated protocol event's user only when that user signed the transaction. It never substitutes a sponsored transaction's fee payer. Router PDAs remain unresolved. This is not yet universal external-route coverage or proof of the end customer behind every intermediary.
- Amounts use integer lamports. Each lot snapshots its rate; `REWARD_BPS` has no default. The first indexing transaction persists the configured rate in `RewardPolicy`; changing the environment rate after that halts indexing. Effective-slot policy versioning is required before rate changes are supported.
- Earned fees start pending. An internal collection boundary allocates actual verified receipts to earlier trade lots. Partial collection is calculated cumulatively to avoid rounding drift. Repeated matching receipts are idempotent; conflicting receipts fail.
- One wallet balance spans tokens, with per-token breakdown and pending, available, reserved and spent amounts. No current token holding is required. USD is an estimate and may be unavailable without hiding the SOL balance.
- Card and SOL reservations share the same ledger, serializable transactions and advisory lock. Reservation IDs bind wallet, type and amount. Retrying a terminal reservation cannot recreate it.
- Payment initiation moves a reservation to SUBMITTING before an external operation. An uncertain outcome stays reserved. Successful settlement and proven release have explicit internal transitions and replay checks.
- Database migration adds constraints against overfunding individual lots, overspending collected entitlements, invalid states and duplicate event/payment identifiers. Cross-table totals also depend on the transactional service and must be reconciled operationally.
- The obsolete Reloadly claim routes and holder reservation helper are hard-disabled, even if `CLAIMS_ENABLED=true`.

## Deliberately unfinished boundaries

`applyVerifiedCollection` is internal and has no automatic or public caller. Its input is a trusted verifier contract, not proof by itself. A chain verifier still needs to authenticate receipt into the correct vault, transaction/instruction identity, protocol source, ordering and allocation completeness. The existing treasury collection worker does not do this and must not be treated as funding the new ledger. Duplicate receipt identity must be canonical at that verifier boundary. Same-slot fees are excluded conservatively until instruction ordering is implemented.

`finishRewardPayment` similarly trusts internal reconciliation evidence. There is no public reservation, SOL withdrawal or new gift-card order endpoint yet. Wallet signatures, quote expiry, payment preparation, chain/provider reconciliation, actual delivery and cost coverage remain to implement. Never release a SUBMITTING reservation solely because of a timeout.

The sample reward percentages in tests are not approved business rates. Retaining a fraction of creator fees does not prove profitability after provider costs, conversion, network fees, infrastructure and fraud. USD rewards are not fixed-dollar liabilities. Provider acceptance, recipient requirements and country/product availability remain launch gates.

The UI still contains historical demo copy and card fees. Do not present it as the final reward experience. Cryptorefills is still provisional under the no-recipient-KYC requirement. No public launch or paid fulfillment is enabled by this work.

## Rollout and historical data

The migration is additive; it does not reinterpret or transfer old holder accruals. Existing ChainReceipt/cursor state prevents old trades from being automatically indexed again. Do not reset a production cursor or remove receipts to backfill: doing so can duplicate historical market data and fee counters. Use a fresh development database or implement an audited, separate historical conversion/backfill with explicit policy dates before production migration. Stop old financial workers during any rollout; old treasury/refund workflows are not integrated with this ledger.

Generate the client with `node node_modules/prisma/build/index.js generate`. Apply migrations only to an explicitly selected development/test database using Prisma migrate deploy. Use SQL migrations rather than db push so the hand-written check constraints are installed.

## Verification

The test script compiles TypeScript tests into ignored `test-results/compiled` then uses Node's test runner. This avoids the local tsx CLI's Windows `os.userInfo` failure without modifying dependencies.

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.tests.json
node --test test-results/compiled/tests/*.test.js
```

TypeScript passed. Unit/regression tests: 16 passed, 0 failed. The PostgreSQL integration test is skipped unless `TEST_DATABASE_URL` explicitly points to a disposable, already-migrated database. Docker is installed here but its daemon is unavailable; no PostgreSQL concurrency/constraint test has been executed yet. Older holder/Reloadly tests remain regression tests of retired code, not acceptance of that product behavior.

The integration test covers duplicate trades/collections, insufficient pending funds, a sell entitlement with no holdings, competing card/SOL reservations, uncertain submission, idempotent settlement, release and a direct database overdraft attempt. It removes only its uniquely prefixed fixture rows. Real protocol fixtures, database integration, vault simulation and end-to-end payments remain required.

Next: run the PostgreSQL integration test, build finalized collection verification and reconciliation, then signed SOL withdrawal preparation. Complete provider approval before wiring live gift-card fulfillment. UI/feed and launch/trading enhancements follow the full implementation plan.
