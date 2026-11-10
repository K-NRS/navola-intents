# navola-intents

NEAR Intents (1Click) cross-chain swaps for [Navola](https://app.navola.ai), an AI trading assistant.

Built for NEAR HACKATHON (Nov 1–14, 2026). Tracks: **Unstoppable DeFi**, **Agent Economy**.

## The problem

Navola's assistant swaps through a DEX aggregator (Rango). It can only deliver to EVM and Solana wallets, so a request like "send my SOL to my Bitcoin address" is refused. Cross-chain routes also mean bridge UIs and token approvals.

## What this adds

NEAR Intents as a second route source for the assistant:

- **More destinations.** Native BTC, XRP, DOGE, LTC, ZEC, TON, Tron, Sui and more. On Intents the recipient is just an address on that chain. 1Click currently lists 216 tokens across 39 chains.
- **One signature.** The user makes one plain transfer to a one-time deposit address. There are no approvals and no bridge UI. Market makers compete to fill the swap; if it fails, funds refund to the user's origin-chain address.
- **Safe for an AI.** The AI tool only prices swaps (`dry: true`). It cannot open a deposit address, so the model cannot move funds. Execution happens only after the user confirms the deposit in their own wallet.

## How NEAR is used

| NEAR technology | Where |
|---|---|
| NEAR Intents, 1Click Swap API | `src/oneclick.ts`: tokens, quote, status, deposit submit |
| Intents asset IDs (`nep141:…omft.near`) | `src/assets.ts`: maps Navola chain names to Intents assets |
| Deposit-address flow | `src/deposit.ts`: builds the unsigned native SOL / EVM transfer to the deposit address, in the exact shape Navola's wallet code already signs |

## Try it (no wallet, no funds)

Requires [Bun](https://bun.sh) ≥ 1.3.

```bash
bun install
```

**1. Price a SOL → USDC (Base) swap**

```bash
bun run quote 0.1 SOL:SOLANA USDC:BASE --recipient 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --refund So11111111111111111111111111111111111111112
```

Expected: a `NEAR Intents quote (dry, nothing moved)` block showing about 8.4 USDC out for 0.1 SOL, a cost under 1%, and an ETA of about 20 s.

**2. Price a route Navola could not do before: SOL → native BTC**

```bash
bun run quote 1 SOL BTC --recipient 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa --refund So11111111111111111111111111111111111111112
```

Expected: roughly 0.001 BTC out, delivered to a Bitcoin address. The ETA is a few minutes because of BTC settlement.

**3. Run the tests**

```bash
bun test
```

Expected: all tests pass. The live tests call the real 1Click API with dry quotes only, so nothing is mocked and nothing moves. The deposit test decodes the built Solana transaction and checks the recipient and lamports.

The addresses in the examples are public, well-known addresses, used only because a quote needs syntactically valid ones. Add `--json` to see the full normalized quote.

## Use it in an app

```ts
import { createOneClick, createIntentsQuoteTool, getIntentsQuote, buildDepositTx } from 'navola-intents'

const oneClick = createOneClick({ jwt: process.env.ONECLICK_JWT }) // JWT optional

// AI SDK tool (price only)
const tools = { intentsQuote: createIntentsQuoteTool(oneClick) }

// After the user confirms: open a real deposit address and build the transfer
const q = await getIntentsQuote(oneClick, { from, to, recipient, refundTo, dry: false })
const tx = buildDepositTx({ chain: q.fromToken.chain, from: user, depositAddress: q.depositAddress!, amount: q.fromToken.amountBase, recentBlockhash })
// …user signs tx in their wallet; poll oneClick.status(q.depositAddress!) until SUCCESS / REFUNDED / FAILED
```

## Scope and limits

- Deposits are native coins only (SOL, ETH and EVM natives). SPL / ERC-20 deposits are not built yet.
- Without a 1Click JWT, quotes include the unauthenticated fee of about 0.2%.
- Intents has no testnet, so real swaps are mainnet.

## Disclosure

- **Pre-existing code.** Navola itself (the Next.js app, Rango integration and AI assistant) existed before the hackathon and is not in this repository. Its baseline is tagged `pre-hackathon` in Navola's private repository. Everything in this repository was written during the hackathon window.
- **Libraries.** `@solana/web3.js`, `ai` (Vercel AI SDK), `zod`.
- **AI assistance.** Code was written with Claude Code.
- **Other project.** None.

## License

MIT
