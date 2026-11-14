# navola-intents

NEAR Intents (1Click) cross-chain swaps for [Navola](https://app.navola.ai), an AI trading assistant.

Built for NEAR HACKATHON (Nov 1–14, 2026). Tracks: **Unstoppable DeFi**, **Agent Economy**.

- **Demo video:** [media/navola-near-demo.mp4](media/navola-near-demo.mp4) (63 s, includes a real mainnet swap: 0.1 SOL to 6.938111 USDC on Base via NEAR Intents)
- **Live:** [app.navola.ai](https://app.navola.ai). Ask the assistant "swap 0.1 SOL to USDC on Base".

## What it does

NEAR Intents is Navola's primary swap route. When you ask the assistant for a swap, it prices it on NEAR Intents first and shows the route on a swap card.

- **Any chain to any chain.** Solana and EVM chains, plus native BTC, XRP, DOGE, LTC, ZEC, TON, Tron, Sui and more. On Intents the recipient is just an address on the destination chain. 1Click currently lists 216 tokens across 39 chains.
- **One signature.** You make one plain transfer to a one-time deposit address. There are no token approvals and no bridge UI. Market makers compete to fill the swap; if it fails, funds refund to your origin-chain address.
- **You stay in control.** The assistant's NEAR Intents tool only prices swaps (`dry: true`); it cannot open a deposit address. Nothing leaves your wallet until you approve the swap. For a chain you have no connected wallet on, you paste the receiving address yourself and see it again before you sign.

## How NEAR is used

| NEAR technology | Where |
|---|---|
| NEAR Intents, 1Click Swap API | `src/oneclick.ts`: tokens, quote, status, deposit submit |
| Intents asset IDs (`nep141:…omft.near`) | `src/assets.ts`: maps Navola chain names to Intents assets |
| Deposit-address flow | `src/deposit.ts`: builds the unsigned native SOL / EVM transfer to the deposit address, in the shape Navola's wallet code signs |
| AI tool | `src/tool.ts`: a Vercel AI SDK tool that prices a swap on Intents (price only) |

## Try it (no wallet, no funds)

Requires [Bun](https://bun.sh) ≥ 1.3.

```bash
bun install
```

**1. Price a SOL → USDC (Base) swap**

```bash
bun run quote 0.1 SOL:SOLANA USDC:BASE --recipient 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --refund So11111111111111111111111111111111111111112
```

Expected: a `NEAR Intents quote (dry, nothing moved)` block with the USDC you would receive for 0.1 SOL at the current price (about 7.5 USDC on 2026-11-14), a cost under 1%, and an ETA of about 20 s.

**2. Price SOL → native BTC**

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

## In Navola

Navola's app (private repository) consumes this package. The integration, written during the hackathon:

- **Intents-first routing.** The assistant's swap tool quotes NEAR Intents first and falls back to Navola's existing aggregator only for pairs Intents cannot take (token origins, unlisted pairs). `NEAR_INTENTS_DISABLED=1` switches it off.
- **Execution.** A server action opens the deposit address with the user's own addresses and returns the unsigned transfer; the swap card signs it with the connected wallet and polls `/status` until the swap settles.
- **Recipients.** A swap pays only an address of the destination chain's family: a connected wallet of that chain, or one the user pastes on the card. Model-supplied addresses are used for pricing only.
- **Browser RPC.** The public Solana RPC rejects browser-origin requests, so the browser's Solana calls go through a same-origin relay with a method allowlist and rate limits.

## Scope and limits

- Deposits are native coins only (SOL, ETH and EVM natives). SPL / ERC-20 deposits are not built yet.
- Without a 1Click JWT, quotes include the unauthenticated fee of about 0.2%.
- Intents has no testnet, so real swaps are mainnet.

## Disclosure

- **Pre-existing code.** Navola itself (the Next.js app, its existing swap aggregator and AI assistant) existed before the hackathon and is not in this repository. Its baseline is tagged `pre-hackathon` in Navola's private repository. Everything in this repository, and the Navola integration described above, was written during the hackathon window.
- **Libraries.** `@solana/web3.js`, `ai` (Vercel AI SDK), `zod`.
- **AI assistance.** Code and the demo video's voiceover (ElevenLabs) were made with AI tools; the code was written with Claude Code.
- **Other project.** None.

## License

MIT
