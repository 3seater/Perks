# Perks gift-card provider alternatives

Research date: September 19, 2026. Public-source research; no provider account, contract approval, paid order, issuer activation, or load test completed. Companion: RELOADLY-RESEARCH-2026-09-19.md.

## Decision

### Signed-in account inspection (September 19, 2026)

User completed login. Account dashboard visibly shows Basic status, an existing Partner ID and an integration-guide link. No whitelabel section or separate API secret is displayed on this dashboard. Displayed remaining purchase allowances: $5,500 today and $11,000 this month, with product-specific exceptions. These are account UI allowances, not a confirmed aggregate allowance for Perks recipients. Full name is unset; identity verification and 2FA are offered. No settings were changed or verification submitted. Password and login credentials are not stored in this report.

The linked developer guide confirms catalog, pricing, validation, order creation and delivery-status endpoints. It states Emoney products require whitelabel access and directs partners to contact Cryptorefills for identity/spending-limit integration. Tron stablecoin orders require full name; documentation recommends USDC on Solana. Merchant-card development can be planned using the existing Partner ID, but API requests and paid fulfillment have not been tested. Our treasury-paying-on-behalf-of-recipients model and recipient KYC exceptions still need explicit clarification. Source: https://www.cryptorefills.com/en/api-docs/developers and authenticated https://www.cryptorefills.com/en/account.

**Provider selected by user: Cryptorefills.** This supersedes the earlier open shortlist and Bitrefill-first recommendation. Proceed with Cryptorefills planning/onboarding and a custom Perks catalog and claim UI, recipient email allowed, provisional $5-$10 minimum to be determined from available products and costs. This selection does not establish provider approval, change the user's no-recipient-KYC preference, or authorize a funded purchase. Confirm treasury-funded reward fulfillment and handling of transactions that require KYC before public launch. No production integration or live fulfillment has been tested.

**Recipient and interface clarification:** Recipient email is acceptable; recipient identity verification remains unacceptable. Users must browse and select gift cards within Perks' own UI. Require catalog/product/denomination data and server-side ordering APIs, rather than relying on an external storefront. In-app code display is preferred where permitted; provider branding/disclosure and retailer redemption requirements must be distinguished from shopping/selection UI. No provider has yet approved the complete Perks program.

**Latest scope update:** $2 redemption is no longer required. User accepts considering $5-$10 minimums and prioritizes easy signup and working fulfillment. This is not permission to add recipient KYC, nor a final choice of minimum. Small-denomination questions below are historical; prioritize production eligibility, recipient requirements and complete costs at $5/$10.

**Updated user requirement:** The operator is willing to complete personal KYC. Recipients must not need KYC. Earlier rejection of all operator verification is superseded. The user still has no registered business; willingness to provide personal identity documents does not establish willingness or ability to provide entity registration documents. Earlier preference against recipient name/address forms remains; recipient email acceptability has not been settled. Re-evaluate established B2B distributors for individual/sole-proprietor onboarding and merchant gift-card fulfillment without recipient KYC. The comparisons below record the earlier, stricter search, not a final shortlist under this clarification.

No provider was verified to meet the complete requirement: no operator/business verification, no recipient personal information, scalable API fulfillment, reliable issuance, and viable small-redemption economics. This is an evidence limitation, not a claim that every privacy-oriented product is impossible.

Cryptorefills is the strongest technical candidate to investigate if recipient email and possible compliance checks are acceptable. WizzGift has explicit no-KYC API claims but contradictory terms. AnonRefill has the closest advertised privacy proposition but insufficient public contractual and operational evidence to recommend funding it.

No provider selected. Do not build a provider-specific production integration based on these marketing claims alone.

## Requirements retained from planning

## Follow-up search: operator KYC accepted

The best next investigation is an approved distributor account buying merchant codes for rewards, with Perks as purchaser and users as recipients. This is a proposed contractual model, not permission to substitute our identity for a recipient when their identity is required. Individual/sole-proprietor production acceptance remains unconfirmed for every shortlisted provider.

### Bitrefill: first qualification target for crypto compatibility

[Business API documentation](https://docs.bitrefill.com/docs/api-overview) expressly supports platforms, resellers and crypto wallets/exchanges through partner onboarding. [Partner integration guide](https://docs.bitrefill.com/docs/mcp-partner-integration-guide) documents account-purchase receipt delivery to the account and retrieval of codes; guest checkout instead needs email. These are technical capabilities, not proof that every recipient is exempt from checks. Request approval of operator-funded rewards, recipient-data rules, individual onboarding and production limits. Do not use the personal API to bypass the business process.

The [published distribution agreement](https://www.bitrefill.com/Automatic%20Payments%20-%20Product_Distr_Agreement_2020_v5.0.pdf) is older and indexed clauses reserve compliance control to Bitrefill. Current agreement must be obtained; it is not a no-recipient-KYC assurance.

### eGifter Rewards: strongest new direct-code lead

[Official API](https://rewards-api.egifter.com/index.html) supports direct codes with provider and issuer approval, as well as hosted links and email/SMS. This could support in-app claims; recipient verification exceptions and individual onboarding remain unknown. API orders use prefunded deposits; duplicate purchase orders return the original order identity; asynchronous fulfillment supports polling/webhooks.

[Pricing](https://egifterrewards.com/pricing/) advertises no platform fee/minimum, with charges for credit-card funding, shipping and currency conversion. Express and enterprise differ in payment methods and catalog. Do not equate instant express signup with production API approval. No verified $2 SKU, crypto-rewards acceptance or direct crypto funding was established. A fiat-funded provider would add conversion and liquidity work.

### Providers not promoted to shortlist

- **Giftbit:** [developer policy](https://www.giftbit.com/developers/) excludes Bitcoin/cryptocurrency use cases. Its [API eligibility page](https://www.giftbit.com/gift-card-api) also describes KYB and an established business/website presence of at least 12 months. Poor fit irrespective of operator KYC willingness.
- **Runa:** [onboarding guide](https://runa.io/onboarding-guide) requires organization KYB and beneficial-owner ID checks. Personal KYC alone is not demonstrated sufficient; recipient experience depends on payout type.
- **Tremendous:** remains excluded by the previously documented crypto restriction.
- **Cryptorefills:** remains technically relevant but transaction-specific end-user KYC is expressly possible, so it does not satisfy an unconditional recipient-no-KYC requirement.
- **Reloadly:** merchant gift-card distribution remains a separate possibility from Swype. Swype's recipient checks cannot be solved by verifying only the operator. Existing corporate eligibility remains unresolved for an individual.

### Ready-to-send qualification inquiry (draft only, not sent)

Subject: Individual operator onboarding and API merchant gift-card rewards

I am a US-based individual building Perks, a Solana token launchpad. Trading generates creator fees collected by our platform. We allocate part of those receipts as wallet-linked rewards, and users may redeem rewards for merchant gift cards or withdraw SOL. Rewards remain claimable after users sell their tokens. Our treasury would purchase cards only when a user redeems.

I can complete personal KYC but do not currently have a registered company. Can you onboard an individual/sole proprietor for this exact production API use case? Please specify required documents.

We need to deliver approved merchant gift-card codes within our website without recipient ID checks, selfies, address or date-of-birth forms. Which products and countries support this, and can recipients ever be required to complete identity verification? Please separately list any required email or other recipient data. We are willing to exclude prepaid Visa/Mastercard products with incompatible activation requirements.

Please confirm direct-code distribution permission, $1/$2 face-value availability, complete per-order and funding costs, minimum prefunding, accepted crypto networks if applicable, API throughput, duplicate-order protection and handling of failed/held orders. Initial pilot funding is approximately $100. We need the agreement applicable to this program before integrating.

No inquiry sent, provider account created, funds deposited or production integration built during this research.

## Previously agreed product requirements

- Perks launches Pump tokens with creator fees routed to its treasury and native cashback/holder mode disabled, subject to current Pump instructions.
- Rewards follow attributable buy/sell fees, including eligible external trades, not holdings. Selling tokens does not erase earned rewards.
- One wallet balance with per-token attribution, backed by collected fees. Obligations denominated in SOL with approximate dollar display.
- No extra Perks launch/trade fee. A reward fraction below creator receipts must fund fulfillment and operating costs; final percentage remains unset.
- Gift cards purchased only when selected; SOL withdrawal available as an alternative. Concurrent withdrawals and card orders must reserve the same balance safely.
- User has roughly $100 for a pilot, no registered business, and prefers no personal-information recipient flow. All-country/all-card availability is desired but unverified.

## Cryptorefills

[Official API overview](https://www.cryptorefills.com/en/api-docs): public ordering can begin without approval; commercial partner setup is separate. Supports Solana crypto settlement, per-order funding, custom UI, codes and email delivery. Requires real recipient email and provider disclosure. No setup/monthly fee or minimum volume advertised; no wholesale discount model. Compliance can redirect users to verification. Suitability of treasury-funded rewards and business-document requirements for a production partnership remain unconfirmed.

[Developer reference](https://www.cryptorefills.com/en/api-docs/developers): catalog supports fixed/range products; validations expose minimum amounts, daily/monthly limits, stock, login and KYC errors. Examples forward actual end-user IP/user agent. Public order creation is not a license to represent Perks as the end user. No paid orders should be created merely to test input. A robust integration needs quote, validation, payment reconciliation, delivery and failure handling. No $2 merchant-card SKU was independently validated.

Assessment: promising crypto-native fulfillment, but not wallet-only anonymity or unlimited unverified distribution. Written acceptance of third-party reward funding is necessary to settle fit, rather than assuming retail checkout permissions cover our model.

## WizzGift

[API introduction](https://docs.wizzgift.com/api/introduction): explicitly advertises no KYC and no periodic API transaction limits, self-service developer credentials and prefunded balance.

[Order reference](https://docs.wizzgift.com/api/order): supports up to 10 product lines and quantity 25 per line, optional email notifications, and product-dependent required fields. Uses checkout creation then payment. This demonstrates batching capability, not proven sustained throughput. Amount-field wording is ambiguous and needs clarification before money moves.

[Terms](https://www.wizzgift.com/en-BR/terms-and-conditions) contradict that proposition: bulk API access appears in enterprise tier with enhanced due diligence; business documents can be requested. Terms also restrict automation/resale, making a specific B2B agreement essential. Account balance is generally non-refundable/non-withdrawable. Do not fund on the assumption that API documentation overrides terms.

[AML policy](https://www.wizzgift.com/en-BR/aml-policy): transaction monitoring, geographic restrictions, reviews and enhanced due diligence apply. It does not support an unconditional anonymity promise.

[US storefront](https://www.wizzgift.com/en-US) displayed starting prices: Apple $2, DoorDash $1, Aerie $0.01, Rewarble Visa $30. These are storefront price ranges, not authenticated API quotes or independently confirmed face-value denominations. Product detail fetches failed; do not promise $2 redemption yet. A different indexed locale displayed different products/prices, underscoring the need for live catalog validation.

Assessment: relevant lead, blocked by documentation conflict and untested fulfillment economics.

## AnonRefill / esimrefill.com

[White-label page](https://www.esimrefill.com/white-label): claims no KYC for operator or customers, crypto funding, automated API gift cards and wholesale pricing without minimum orders. The documentation request linked to an email-protection URL, not a public operational gift-card specification.

[Visa page](https://www.esimrefill.com/giftcards/virtual-visa-card): advertises card details delivered without identity verification. The reviewed page did not identify a specific issuer agreement or establish all fees, supported recipient countries, identity step-up conditions or API limits.

[Terms](https://www.esimrefill.com/terms): largely eSIM-focused; gift cards remain subject to issuer terms and delivered codes are final sale. The reviewed terms do not identify a contracting legal entity or detailed card program rules.

Assessment: closest explicit marketing match, insufficient evidence for a reliability recommendation. Not classified as fraudulent; simply unvalidated. Require real issuer documentation, operator identity, applicable contract, SKU pricing and a successful small fulfillment/redemption test before considering production.

## Other providers checked

- **Bitrefill:** [API overview](https://docs.bitrefill.com/docs/api-overview) distinguishes personal API from business/reseller integrations. [Partner guide](https://docs.bitrefill.com/docs/mcp-partner-integration-guide) specifies business verification for affiliate enrollment and compliance limits/checks even for guests. Personal API access does not prove permission for Perks bulk rewards.
- **Coinsbee:** [official verification help](https://help.coinsbee.com/en/support/solutions/articles/101000336350/) publishes unverified limits of EUR1,000/order and EUR10,000 total, with verified-only products. Article is old; reconfirm before use. No adequate public B2B contract establishing unlimited no-verification reward issuance was found.
- **Tremendous:** [production API access](https://developers.tremendous.com/docs/production-api-access) requests company documentation and identifies crypto among prohibited business categories. Poor fit for Perks as specified.
- **Tillo:** [API](https://api.tillo.tech/) supports code/URL fulfillment; [onboarding](https://tillo.tech/docs/getting-started) does not establish the no-business-verification requirement. Not shortlisted for that requirement.

## Visa and recipient privacy

Changing distributors does not remove the underlying issuer's activation requirements. [Rewarble Visa](https://rewarble.com/brands/visa) explicitly asks for cardholder name and billing address. Swype's personal-information requirements are covered in the Reloadly report. Merchant gift-card code delivery may require less data, but retailer accounts and redemption requirements still vary. No-ID purchase, no operator KYB, and no recipient personal information are three different properties.

## Financial and operational acceptance criteria (our analysis)

For each allowed SKU obtain face value, exact landed cost, taxes/fees, funding network, required recipient fields, regional restrictions, refund policy and settlement time. A nominal $2 card costing $2.40 cannot be offered against $2 rewards unless allocated platform margin covers the difference. A smaller reward fraction alone is not a guarantee against losses, especially if backing remains volatile SOL or fixed transaction costs dominate small orders.

Never pre-purchase cards on accrual. Reserve user balance before fulfillment, maintain coverage for retained SOL liabilities, and release a reservation only after confirmed failure/refund. An uncertain provider response must be reconciled before retrying or enabling SOL withdrawal. Provider balance credit is not recovered cash. Use a per-SKU cost cap and suspend products that exceed available subsidy.

## Concrete questions remaining for the shortlist

1. Can a US individual operate this exact Solana trading-reward platform after personal KYC, without registered-company documents, including at production volume?
2. Is treasury-funded fulfillment to third-party wallet users permitted? Which contract governs API use and overrides conflicting retail terms?
3. Which merchant SKUs can be delivered in our UI without recipient name, address, phone or email? What checks can arise later?
4. Which US and international cards actually support $1/$2 face value, and what is total cost including funding and delivery?
5. For Visa/Mastercard, identify issuer, cardholder agreement, activation inputs, fees and geographic restrictions.
6. What are throughput, idempotency, reconciliation, webhook authentication and refund guarantees? What happens to unused float?

These are provider questions, not messages sent. No external contact or purchase was performed.
