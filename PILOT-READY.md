# Mainnet pilot — September 19, 2026

The current scope is launch → real listing → external trading → wallet reward accounting. Gift-card purchases remain disabled. The user enters token details in the form; no token name/ticker is needed in chat.

## Reward policy

User clarified that the buffer is strictly for card redemption, excluding general business operating costs. Configured `REWARD_BPS=9500`: each wallet earns floor(actual creator-fee lamports × 95 / 100). The remaining 5% is retained. This is Perks' own trade reward policy, not a claim to exactly reproduce every Pump cashback rule. No holding requirement. Selling all tokens does not erase rewards.

Read-only mainnet probe found fee-config SOL tier creator fee 30 bps (0.30%). The older Global creatorFeeBasisPoints field read 5 bps; that fallback is NOT the current fee-config schedule. With the observed fee tier, Perks rewards are approximately 0.285% of traded SOL, subject to protocol rounding. Accounting uses actual authenticated TradeEvent creatorFee / PumpSwap coinCreatorFee values, not the approximation. Standard launches explicitly disable cashback, holder rewards and mayhem. Rewards accrue only for trades that actually generate creator fees and whose trader wallet can be verified; ambiguous router identities remain unresolved rather than guessed.

Sources checked: https://pump.fun/docs/fees ; https://pump.fun/docs/terms-and-conditions ; installed official @pump-fun/pump-sdk 2.0.0 src/fees.ts. These support variable protocol rates and on-chain fee authority, not a guaranteed cashback return.

Rewards are SOL liabilities. USD is indicative and may move with SOL. Pending rewards become funded only after a verified creator-fee collection reaches the treasury. Card checkout must reserve the full provider SOL payment plus network costs, use an unexpired quote, and preserve other users' liabilities. `lib/redemption-budget.ts` tests that budget contract but is not yet connected to fulfillment. A 5% reserve alone is not a guarantee that every card quote can be subsidized; unaffordable cards must be declined or require a smaller denomination.

## Live configuration

- User launch/trading wallet: FqrpVRn3bsu56xG4xRpVySt37CHzRC1mNipL1LbTEeho
- Shared creator recipient: Ck1GCSBQZgup9mZJkZ3wT8HqZdRk8uiTSgFje5KxYpLK
- Wallet custody; no server treasury private key.
- Mainnet, demo off; launches limited to the signed pilot wallet above.
- Wallet-approved collection enabled; card payments and old autoswap disabled.
- PostgreSQL and Redis run under Docker Compose project perks-local.
- Finalized targeted indexer initialized before the first launch. Never reset its cursor to the current tip after tokens exist.
- Background indexer PID at this session: 107176. Logs: test-results/pilot-indexer.log and pilot-indexer-error.log. It must remain running while testing. It is a local background process, not an installed production service.
- Start manually if it stopped: `node --import tsx workers/indexer.ts`. Check there is not already an instance first.

## Launch flow

1. Connect the pilot wallet on http://[::1]:3000 and select Launch a Coin.
2. Enter name, ticker, description, image and optional initial SOL buy.
3. Sign the preparation message. It binds metadata, image SHA-256, wallet, initial buy and an expiring one-use nonce; it moves no funds.
4. The server uploads metadata, builds a Pump transaction with the fixed treasury creator, and simulates it.
5. Review the token amount and estimated wallet debit, then sign the transaction in the wallet. The SDK's initial-buy maximum includes 1% tolerance and is disclosed separately from network/rent.
6. The server relays only that exact prepared transaction after verifying signatures. Helius credentials never enter the browser. A signed pending launch is retained in session storage for rechecking.
7. The finalized indexer verifies creation and activates the listing. The homepage refreshes every 15 seconds.
8. Trade through Pump.fun; view rewards in My Perks or Profile → Rewards. Treasury collection is separately wallet-approved at /treasury. The treasury needs SOL for its collection transaction fee.

Metadata provider is Pump's existing https://pump.fun/api/ipfs endpoint. HEAD returned 405; empty POST returned 400 Missing file. A real upload remains untested until the user supplies their token image. Pinata remains available as an alternate server-configured provider. No invented token/image was publicly uploaded.

## Validation completed

- TypeScript and 34 tests passed, including actual PostgreSQL concurrency tests, collection allocation/replay, sold-out wallets, signed transaction immutability and redemption budgets.
- Unsigned mainnet simulation: create-only passed, estimated debit 0.005344 SOL (including account rent/network at that observation).
- Unsigned mainnet simulation: create + 0.001 SOL buy passed, estimated debit 0.008508079 SOL, 35,323.892708 token estimate. These are observations, not fixed launch prices.
- No simulation signed by the user's wallet; no real token or trade was submitted by the agent.
- Real /api/tokens returned demo=false, empty tokens, zero stats.
- Real /api/rewards returned all-zero balances for the pilot wallet, rewardBps=9500, claimsEnabled=false.
- Browser launch form displayed mainnet and 95% trader share with no demo placeholders.

## Remaining proof and limitations

The user must perform the first wallet-approved launch/trades. Only then can actual mint creation, live listing, per-trade rewards, and a real collection receipt be verified end to end. Mainnet simulations are not substitutes for those checks. Gift-card payment/reconciliation is unfinished and disabled. Holder counts and graduated-pool market caps are currently unavailable rather than fabricated. Direct curve price, trade volume and creator-fee totals are live; USD uses a freshness-checked CoinGecko display estimate when no Jupiter key is configured.

## First live launch recovered

The user launched Test (TEST), mint 8zQ6qnd8i3XQyS189LzAkUJ9kDxiry5DZfwx8fBuUQpi, in finalized slot 448559688. The old full-block reader failed because an unrelated transaction in that block used version 1. It did not advance the cursor past that failure. Updated discovery retains all relevant signatures; the worker reads the block signature list to preserve canonical order and fetches only relevant transactions. Unknown versions on relevant transactions still fail closed. Replayed five activity blocks from the existing checkpoint, activating the real token and recording its actual trades. No cursor reset or synthetic balances.

Live API verification: TEST present in New feed and the launcher's profile. Positions returned empty with no errors (no Perks holdings at that observation). Wallet reward pending 5,629,628 lamports, funded available zero; collection still needed. Profile now uses server Helius RPC and filters all active Perks mints, not only tokens launched by the wallet; SOL and unrelated tokens are omitted. Profile refreshes every 15 seconds. Tests: 41 passed including new mixed-version ordering and Perks-position regressions. Restarted worker PID 134172; previous PID exited on the unsupported full-block response. Feed USD display now retains cents for small reward values.
