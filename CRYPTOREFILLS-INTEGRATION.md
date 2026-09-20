# Cryptorefills integration — September 19, 2026

The user explicitly directed us to proceed after reviewing the provider's “no KYC required for your users” statement. Cryptorefills is the implementation target. Do not repeat provider-selection questions or block catalog development on written approval. Email delivery is accepted. Conditional verification responses must block affected unpaid redemptions; post-payment exceptions still require reconciliation rather than an automatic refund from Perks reserves.

References: [integration overview](https://www.cryptorefills.com/en/api-docs), [developer reference](https://www.cryptorefills.com/en/api-docs/developers). Marketing and conditional verification documentation are both recorded; neither guarantees that merchant account checks never occur.

## Implemented and observed

- Read the account's existing Partner ID and saved it only in ignored `.env.local`. No password was saved. Enabled the read-only catalog locally. No account settings were changed.
- Successfully queried brands, products, payment methods and prices from the real API. No orders, validation submissions with recipient data, or payments were made.
- Added `/cards` and a live-mode modal using a country-specific searchable catalog. Products resolve to actual fixed denominations or ranges with exact increment validation. E-money, Visa/Mastercard and unavailable products are excluded. Only email-delivered USDC-priced products are admitted by this first adapter.
- Prices are fetched server-side after resolving the product against the current catalog. Client prices are never trusted. The displayed 30-second estimate is a local freshness policy, not a provider-guaranteed price lock, SOL debit, reservation or promise of fulfillment.
- The live UI no longer calls the old Reloadly challenge/order flow. The demo's extra $0.50 card fee was removed. Existing demo cards remain explicitly illustrative.
- During the read-only probe, US Amazon.com offered a $5–$500 product in $1 increments; the $5 quote was 5.18 USDC. Steam offered $10/$20/$50/$150 fixed cards; $10 cost 11.28 USDC. These are observations, not enduring prices or fee promises. Brand summary limits can differ from product limits: always validate the actual product.
- USDC catalog responses used a default `USDC-MATIC` payment-method label, while the payment-method endpoint separately listed USDC on Solana. The quote adapter does not interpret that label as a verified Solana payment instruction. Actual order validation/network choice is still required.

## Configuration

`CARD_CATALOG_ENABLED=true` and server-only `CRYPTOREFILLS_PARTNER_ID` enable GET catalog/price requests. They do not enable purchases. Production additionally requires Redis rate limiting and `TRUSTED_CLIENT_IP_HEADER` configured to a header that a trusted ingress overwrites. Never accept an arbitrary client-supplied forwarded IP chain. Development probes omit IP rather than inventing an end-user IP. Production requests forward the actual visitor context required by the provider.

## Remaining work

Add product-specific redemption terms/notes in a safe display, a full country selector, wallet reward balances beside the picker, recipient email entry, order validation, margin-funded all-in SOL quotes, signed wallet authorization, shared reservations, persisted payment identity, order creation, delivery recovery and reconciliation. Do not expose provider credentials or private card codes through public catalog responses.

The adapter currently exposes GET operations only. No card purchases can occur through the new route. The provider's validation endpoint should handle eligibility before payment; undocumented schemas must be checked against actual responses. Do not create speculative orders to test connectivity.

Tests cover range/fixed amounts, prepaid exclusion, country mismatches, quote/product identity and the GET-only transport boundary. Current suite: 21 passed, 1 database integration test skipped. TypeScript passes. Funded fulfillment and PostgreSQL concurrency remain untested.

Local HTTP checks also returned the US and GB catalogs (471 and 194 filtered brands at the time of testing), a real Amazon $5 estimate, and HTTP 400 for an unsupported $5.50 increment. A second preview server briefly conflicted with the existing server's build files; it was stopped. Use the existing Perks preview at `http://[::1]:3000/cards` in this workspace session. The IPv4 port 3000 belongs to a separate project and was left untouched.

## Rewards modal UI update

The normal rewards entry point now uses the live catalog in both demo and live modes. The first screen shows wallet rewards (or an explicitly labeled demo balance), country selection and searchable cards. There are no amount controls until a card is selected. Supported fixed/range amounts, card terms and a read-only quote appear within the same modal; the back button restores browsing. The separate catalog link and obsolete demo fulfillment/code flow have been removed from this modal. The modal uses the site's blue glass styling and a compact balance card for shorter screens. Real purchases remain disabled. TypeScript passes.
