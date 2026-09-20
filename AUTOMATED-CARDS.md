# Automated Perks gift-card checkout

Implemented September 20, 2026. This supersedes the earlier catalog-only and collection-before-redemption notes.

## Customer flow

Choose a card, enter its actual delivery email, review its reward cost, and sign the purchase message. The message authorizes a maximum SOL reward deduction, not a transfer from the customer wallet. A background worker pays Cryptorefills in native SOL, waits for finalized payment, settles the actual cost, and polls for delivery. Unused quote allowance is returned. Codes are encrypted at rest and require wallet proof to retrieve. “Restore my gift cards” recovers orders after changing browsers.

Verified uncollected creator fees count toward eligible rewards. Reserved and spent amounts reduce those earnings immediately. A later collection only changes backing; it never credits the same reward again. Customer purchase cost currently includes provider cost and network fee, with a clearly authorized 1% price ceiling. No subsidy is silently charged to the operator.

## Local setup already completed

- Database migration applied to `perks` and disposable `perks_test`.
- Dedicated payment wallet: `GdY92viwYXbR1WHL34QY3PugyMkoyBgy9xhGNceEi27m`.
- Worker signing material and its configuration live under ignored `.secrets/`; Windows ACLs restrict access to the owner and the local sandbox account that created it. The key is never returned by an HTTP route.
- The existing server-only voucher encryption key is retained. Back up it and `.secrets` securely; losing them can lose access to funds or encrypted card records.
- Checkout activation is gated by a recent matching payment-worker heartbeat and a positive funding balance. Order acceptance additionally checks actual quoted cost, eligible rewards, outstanding obligations and configured limits. The worker rechecks on-chain cash before paying.
- Local site: `http://[::1]:3000`. The separate IPv4 port 3000 belongs to another project.

Run `node workers/setup-card-payments.cjs` once (safe to rerun without replacing keys). Run `node --import tsx workers/card-payments.ts` alongside `node --import tsx workers/indexer.ts`. The payment worker retries temporary connectivity failures and uses a database election lock to prevent two workers processing the same order simultaneously. These are local processes, not an installed always-on production service; they stop when the machine stops.

The payment wallet still needs operator funding before a paid test. Funding this wallet does not fabricate customer rewards. The customer also needs enough eligible rewards for the selected card's full quoted cost. No real provider order or payment was created during implementation.

## Configuration

Non-secret web/worker settings in `.env.local`:

```dotenv
CARD_REDEMPTIONS_ENABLED=true
CARD_PAYMENT_PUBLIC_KEY=GdY92viwYXbR1WHL34QY3PugyMkoyBgy9xhGNceEi27m
CARD_PAYMENT_FEE_CAP_LAMPORTS=10000
CARD_MAX_ORDER_LAMPORTS=100000000
CARD_MAX_DAILY_LAMPORTS=500000000
AUTO_COLLECTION_ENABLED=true
AUTO_COLLECTION_MIN_LAMPORTS=1000000
AUTO_REFILL_TARGET_LAMPORTS=100000000
```

Purchase limits are ceilings, not funding recommendations or scheduled expenses. Each payment still needs a customer-signed order and sufficient verified rewards. `TRUSTED_CLIENT_IP_HEADER` must be set to an ingress-overwritten client-IP header in production. Recipient email and visitor context are sent to Cryptorefills only through checkout validation/order calls.

## Collection and replenishment

The worker checks collection once a minute, submits only when the fee threshold is reached, and persists signed bytes before broadcast. Collection pays the existing configured creator treasury (`Ck1G…YpLK`), not a newly invented recipient. Permissionless curve collection can use the payment wallet for gas. Some AMM instructions need the treasury signer; without it those collections are skipped.

Automatic refill from the existing treasury requires its signing authority. If the operator chooses that setup, store the treasury's Solana keypair JSON securely on the worker host and add `treasuryKeyPath` to `.secrets/card-worker.json` locally. Never send that private key in chat. The worker validates it against `PERKS_TREASURY_ADDRESS`, refills only the configured payment wallet from proven collection proceeds, and retains `TREASURY_RESERVE_LAMPORTS`. This signer has **not** been supplied, so automatic treasury-to-payment-wallet replenishment is not currently active. Direct operator funding supports automatic customer purchases in the meantime.

## Recovery behavior

- Lost provider-create response: never blindly repeat creation. An invoice without persisted signed payment is left unpaid; its reservation is released.
- Crash after transaction persistence: rebroadcast identical signed bytes only.
- Confirmed payment: settle the actual provider amount plus network fee once, then poll delivery.
- Confirmed failed transaction: charge only its actual network fee and release the remainder.
- Uncertain expired transaction or post-payment provider exception: keep the order under review and continue safe reconciliation; never issue a second payment or assume a refund arrived.
- Provider refunds need verified returned funds before crediting rewards; manual exception reconciliation is still required for those cases.

## Validation and remaining live proof

TypeScript and 51 tests passed, including PostgreSQL concurrency, spending before collection, later collection without recrediting, crash recovery, exact-byte rebroadcast, and a simulated automatic pay-to-delivery workflow. The browser catalog and disconnected purchase entry were inspected. A real funded Cryptorefills validation/order/payment/delivery is still required to verify the provider's live response shapes. Unknown payment currencies, networks, addresses, amounts or schemas fail closed before broadcast. No claim of a successful live redemption is made yet.

Provider references: https://www.cryptorefills.com/en/api-docs/developers and the provider's published Cryptorefills Buy API reference. The public API uses per-order payment addresses, not a prefunded provider account balance.
