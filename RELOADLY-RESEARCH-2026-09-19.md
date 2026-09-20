# Reloadly feasibility research for Perks

Research date: September 19, 2026. Public-site inspection and official documentation only. No account was created, no funds deposited, no cards purchased, and no support message sent. This is a feasibility record, not provider approval or a production integration test.

## Decision

Merchant gift cards remain a plausible fulfillment option for Perks. Anonymous Visa/Mastercard activation does not meet the published requirements. The smallest currently purchasable merchant cards, account-specific costs, individual/sole-proprietor eligibility, and approval for the exact token-trading rewards model remain unverified.

Perks should retain SOL rewards until the user requests a redemption, support SOL withdrawals independently, and use a separate provider float for card fulfillment. Do not pre-create third-party reward links for every accrual.

## Smallest cards: evidence and limits

I inspected the public [pricing catalog](https://www.reloadly.com/pricing) in the browser, using United States and the Money Cards filter. It displayed Visa Prepaid US $1 to $150 and Mastercard Prepaid $1 to $150 US. Higher-value variants, Amex, PayPal, and Rewarble products were also present. This establishes advertised product ranges, not live stock, total purchase cost, eligibility, or anonymous activation. It is not an exhaustive global minimum.

The Gift Cards filter displayed Amazon, Target, Walmart, Starbucks, and other brands, but not their amounts or prices. Clicking a brand did not expose product details. The login path led to an unauthenticated login page. There is no existing authenticated account available for the account pricing table.

A [2022 official tutorial](https://www.reloadly.com/blog/how-to-display-a-redeem-instruction-message-for-a-purchased-gift-card/) shows Amazon US denominations starting at $5, and 1-800-PetSupplies at $25. These are old sandbox examples, not current purchasable minimums. Do not market either as a confirmed live price.

The [API reference](https://docs.reloadly.com/gift-cards) describes fixed denomination lists and variable minimum/maximum amounts. It exposes fees, discount, currency, and product status. Recipient email is optional; omitting it suppresses Reloadly email delivery. Transaction states include pending, processing, successful, failed, and refunded; failed does not itself establish a refund. These technical capabilities are not blanket permission for anonymous distribution.

Conclusion for a $2 reward balance: a $2 merchant card is possible only if an eligible live product supports that value and its costs fit our budget. Otherwise keep accumulating or withdraw SOL. No current $2 merchant product was verified in this research.

## Visa/Mastercard activation and privacy

The [Swype cardholder guidance](https://support.reloadly.com/how-much-does-swype-actually-need-to-know-about-you) requires name, email, residential address, date of birth, and phone number. Its table adds selfie/liveness and government ID at $1,000 per card or aggregate. The prose is slightly inconsistent at the exact boundary; use the stricter table pending confirmation.

The [partner KYC guidance](https://support.reloadly.com/-) describes baseline self-attested information and possible additional checks. Search-index and opened versions differed on detailed threshold wording. Both require personal information. No-document upload in a baseline flow does not mean anonymous.

The [corporate terms](https://www.reloadly.com/corporate-terms/) restrict prepaid-card anonymity claims and preactivation; they also restrict storage of payment-card credentials. Account eligibility is limited to business/government entities. Funding may take up to three business days; card funding carries 3%. The terms include inactivity and geographic restrictions. These are provider terms, not a determination of Perks' legal classification.

Swype's [business onboarding guidance](https://support.reloadly.com/before-you-issue-a-single-card-we-need-to-know-who-you-are) requires KYB approval, including business details, tax ID, website, addresses, and registration review. Do not assume Swype onboarding details apply identically to every merchant-card account.

Catalog entries do not identify every underlying card program. Do not apply Swype's exact fee schedule to every Visa, Mastercard, Amex, or Rewarble SKU without matching the product to its issuer agreement.

## Swype costs and usability

The [Swype fee schedule](https://support.reloadly.com/complete-fee-schedule-card-program-terms) lists $0.10 for purchases below $5, foreign purchases at $0.55 plus 2.75%, domestic declines at $0.15, international declines at $0.55, and disputes at $50. It also lists $2.50 account activation/maintenance entries whose exact account scope needs clarification. These are card-program charges, separate from our gift-card API purchase price.

The [95% balance policy](https://support.reloadly.com/the-95-balance-policy-what-to-script-for-support) says a single transaction cannot generally consume more than approximately 95% of available balance. Its examples show $20 funding permitting roughly $19 in one transaction. This is a spending restriction, not an automatic 5% fee.

[Expiration guidance](https://support.reloadly.com/your-card-has-a-shelf-life-heres-the-countdown) describes activation-link, inactivity, and maximum-validity clocks. This reinforces the recommendation to exclude these cards under the current minimal-information requirement.

## Merchant cards and embedded delivery

The [developer introduction](https://developers.reloadly.com/gift-cards/introduction) describes accessing and issuing redemption codes. Perks can plausibly build its own branded merchant-card display and instructions.

[Additional-requirements documentation](https://developers.reloadly.com/gift-cards/gift-cards-with-additional-requirements) says products expose extra requirements, currently illustrated with a user identifier. These must be examined product by product. A wallet address should not automatically be substituted for a required identifier without confirming its semantics.

Receiving a code in Perks is distinct from spending it at a merchant. The merchant may require an account, shipping details, or regional eligibility. Do not promise anonymity throughout the merchant checkout.

Recommendation: use direct merchant-card purchases at claim time. Avoid Perq links as the persistent user balance: [Perq expiration guidance](https://support.reloadly.com/do-perq-rewards-expire) describes a 60-day unredeemed-link window and a further wallet expiration mechanism after initial redemption. Those rules should not replace our earned-SOL ledger.

## Funding and operating costs

[API pricing](https://support.reloadly.com/how-much-does-it-cost-to-use-reloadlys-api) advertises free setup and no monthly API fee. Product costs still apply. [Sandbox access](https://support.reloadly.com/locating-your-api-credentials) is described as available without a credit card.

[Funding guidance](https://support.reloadly.com/payment-options) lists bank/card/crypto options, but no Solana rail. Its crypto wording mentions Bitcoin, Ethereum, stablecoins on named non-Solana networks, and Binance Pay; exact supported asset/network pairs must be verified in checkout. Some funding may wait until business hours. It lists a $100 minimum, whereas the [card-limit article](https://support.reloadly.com/credit-card-limit) lists $25-$500. Confirm account terms rather than choosing whichever public number is convenient.

A [2021 article](https://www.reloadly.com/blog/gift-card-software/) describes a $0.50 per-card fee and an example discount. It is historical evidence only; neither amount should be treated as today's universal price.

The separate $100 provider float can fund a limited pilot. It is not the revenue source, does not finance unlimited claims, and may yield less than $100 of spendable credit after funding costs. Replenishment must finish before the float runs out.

## Reliability, refunds, and security

[Gift-card refund guidance](https://support.reloadly.com/gift-card-refunds) says purchases are generally nonrefundable, with narrow exceptions for eligible undelivered, unredeemed, unexpired rewards. Do not promise change-of-mind refunds or restore SOL solely because an HTTP request timed out.

[Security guidance](https://support.reloadly.com/how-to-enable-the-2fa) discusses 2FA and production IP whitelisting; parts call whitelisting recommended and others required for gift-card purchases. Plan for both and confirm enforcement. Backend egress addresses may need to be stable.

Proposed Perks controls, not claims about Reloadly guarantees:

- Reserve rewards before submitting a purchase, shared with the SOL withdrawal path.
- Persist an order identifier and provider transaction ID where available.
- Reconcile uncertain outcomes without blind purchase retries.
- Confirm provider duplicate-handling, webhook authentication, and report visibility guarantees.
- Encrypt merchant voucher secrets; do not log them or return them in public caches.
- Separate estimates, spendable rewards, and pending redemptions.
- Monitor provider float and preserve user obligations when fulfillment is unavailable.

## Profitability model to validate

Let F be the gift-card face value, r the user's reward fraction, and C the fully loaded fulfillment cost, all valued consistently for the transaction. If F represents the user's allocated rewards, corresponding gross creator revenue is F/r. Transaction contribution is F/r - C, before fixed operating expenses.

Illustration only: at 90%, $2 of allocated rewards correspond to about $2.22 of revenue. If fulfillment costs $2.50, this loses about $0.28 before overhead. At the same hypothetical flat $0.50 overhead, a $25 card has different economics: $27.78 gross revenue against $25.50 cost. No example here is a verified Reloadly quote.

This equation is valid only when the retained funding is still available and value-matched. A historic dollar valuation of retained SOL cannot guarantee future dollar fulfillment costs. Retained reserves, conversion timing, allowed denominations, and price buffers must be designed together. Already-earned SOL must never be reduced to repair a margin shortfall.

No reward percentage is approved by this research. Derive one from real catalog quotes, worst-case allowed redemption sizes, operational reserves, and volume scenarios.

## Documentation limitations

- The supplied llms.txt was accessible in the browser and explicitly describes crypto platforms as a use case. The gift-card product page separately advertises crypto cash-out. This supports general relevance, not approval for our exact model.
- API Terms, Platform Client Terms, and Prohibited Clients links returned homepage-style content through the web reader. Obtain the operative policies directly before relying on eligibility assumptions.
- Marketing counts, funding limits, and some verification text vary across pages. Do not infer universal support from a country dropdown or a marketing coverage count.
- No authenticated production catalog, order, settlement test, or provider response has been obtained.

## Questions for Reloadly — draft only, not sent

1. Can a US individual or sole proprietor operate this program? Which agreement and verification requirements apply?
2. Do you approve a Solana token launchpad distributing trading-fee rewards as merchant gift cards, alongside SOL withdrawals?
3. Supply the current production catalog with the lowest denominations, currencies, fees, discounts, stock/status, and recipient requirements. Which products permit $1, $2, and $5 redemptions?
4. Which merchant products permit API code delivery without recipient name, email, phone, or identity documents? What end-user screening remains our responsibility?
5. Which issuer/program governs each payment-card SKU? Confirm its activation data, fees, restrictions, and expiration.
6. Which funding rails are available to our account? Is Solana USDC supported? Provide net fees, minimums, settlement windows, and automation options.
7. Are purchase references idempotent? What is the safe timeout recovery procedure, reporting delay, and definitive refund signal?
8. Confirm fulfillment limits, availability targets, voucher-display permissions, and applicable API/platform/prohibited-use policies.

Next evidence needed: an eligible authenticated account or provider-supplied catalog/quote, followed by sandbox validation and a separately authorized small live purchase. Do not deposit money merely to resolve public-documentation uncertainty.
