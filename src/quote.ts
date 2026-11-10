import { findAsset, toBaseUnits } from './assets'
import type { OneClick } from './oneclick'

export type IntentsQuoteParams = {
  from: { symbol: string; chain?: string; amount: string }
  to: { symbol: string; chain?: string }
  /** Address on the destination chain that receives the output. */
  recipient: string
  /** Address on the origin chain that receives a refund if the swap fails. */
  refundTo: string
  /** Default 100 bps (1%). */
  slippageBps?: number
  /** `true` = price only, no deposit address. `false` = opens a real deposit address. */
  dry: boolean
}

export type IntentsQuote = {
  provider: 'near-intents'
  fromToken: { symbol: string; chain: string; assetId: string; amount: string; amountBase: string }
  toToken: { symbol: string; chain: string; assetId: string; amount: string; minAmountBase: string }
  usdIn: number
  usdOut: number
  /** Value lost to fees, spread and slippage: usdIn − usdOut. */
  feeUsd: number
  etaSeconds: number
  slippageBps: number
  /** Present only for non-dry quotes: where the user sends `fromToken.amountBase`. */
  depositAddress?: string
  deadline?: string
}

const QUOTE_TTL_MS = 10 * 60_000

export async function getIntentsQuote(
  oneClick: OneClick,
  p: IntentsQuoteParams,
): Promise<IntentsQuote> {
  const tokens = await oneClick.tokens()
  const origin = findAsset(tokens, p.from.symbol, p.from.chain)
  if (!origin) throw new Error(`NEAR Intents does not support ${p.from.symbol} on ${p.from.chain ?? 'its native chain'}`)
  const dest = findAsset(tokens, p.to.symbol, p.to.chain)
  if (!dest) throw new Error(`NEAR Intents does not support ${p.to.symbol} on ${p.to.chain ?? 'its native chain'}`)

  const slippageBps = p.slippageBps ?? 100
  const { quote } = await oneClick.quote({
    dry: p.dry,
    swapType: 'EXACT_INPUT',
    slippageTolerance: slippageBps,
    originAsset: origin.assetId,
    depositType: 'ORIGIN_CHAIN',
    destinationAsset: dest.assetId,
    amount: toBaseUnits(p.from.amount, origin.decimals),
    refundTo: p.refundTo,
    refundType: 'ORIGIN_CHAIN',
    recipient: p.recipient,
    recipientType: 'DESTINATION_CHAIN',
    deadline: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  })

  const usdIn = Number(quote.amountInUsd)
  const usdOut = Number(quote.amountOutUsd)
  return {
    provider: 'near-intents',
    fromToken: {
      symbol: origin.symbol,
      chain: origin.blockchain,
      assetId: origin.assetId,
      amount: quote.amountInFormatted,
      amountBase: quote.amountIn,
    },
    toToken: {
      symbol: dest.symbol,
      chain: dest.blockchain,
      assetId: dest.assetId,
      amount: quote.amountOutFormatted,
      minAmountBase: quote.minAmountOut,
    },
    usdIn,
    usdOut,
    feeUsd: Math.max(0, usdIn - usdOut),
    etaSeconds: quote.timeEstimate,
    slippageBps,
    depositAddress: quote.depositAddress,
    deadline: quote.deadline,
  }
}
