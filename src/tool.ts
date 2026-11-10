import { tool } from 'ai'
import { z } from 'zod'
import type { OneClick } from './oneclick'
import { getIntentsQuote } from './quote'

/**
 * Vercel AI SDK tool: price a cross-chain swap on NEAR Intents.
 * Always a dry quote: it never opens a deposit address, so the model cannot move funds with it.
 */
export function createIntentsQuoteTool(oneClick: OneClick) {
  return tool({
    description: `Price a cross-chain swap on NEAR Intents (1Click). Market makers compete to fill it; the user sends the input to a one-time deposit address and receives the output on the destination chain. No bridge approvals.

Use it to compare against other routes, and for destinations other routers cannot reach: native BTC, XRP, DOGE, LTC, ZEC, TRON, TON, SUI and more (the recipient is just an address on that chain).

Returns USD in/out, value lost to fees (feeUsd) and an ETA in seconds. This is a price only; it moves nothing.`,
    inputSchema: z.object({
      fromToken: z.object({
        symbol: z.string().describe('Token to sell, e.g. "SOL"'),
        chain: z.string().optional().describe('Origin chain, e.g. "SOLANA", "BASE"'),
        amount: z.string().describe('Human amount of the token, e.g. "0.5"'),
      }),
      toToken: z.object({
        symbol: z.string().describe('Token to receive, e.g. "USDC", "BTC"'),
        chain: z.string().optional().describe('Destination chain, e.g. "BASE", "BTC"'),
      }),
      recipient: z.string().describe('Receiving address on the destination chain'),
      refundTo: z.string().describe("User's address on the origin chain, for refunds"),
      slippageBps: z.number().int().min(10).max(1000).optional(),
    }),
    execute: async ({ fromToken, toToken, recipient, refundTo, slippageBps }) =>
      getIntentsQuote(oneClick, {
        from: fromToken,
        to: toToken,
        recipient,
        refundTo,
        slippageBps,
        dry: true,
      }),
  })
}
