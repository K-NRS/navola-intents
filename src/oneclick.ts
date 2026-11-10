import type { IntentsToken } from './assets'

export const ONECLICK_URL = 'https://1click.chaindefuser.com/v0'

/** Request body for `POST /quote` (subset Navola uses). */
export type QuoteRequest = {
  dry: boolean
  swapType: 'EXACT_INPUT'
  slippageTolerance: number // basis points
  originAsset: string
  depositType: 'ORIGIN_CHAIN'
  destinationAsset: string
  amount: string // base units
  refundTo: string
  refundType: 'ORIGIN_CHAIN'
  recipient: string
  recipientType: 'DESTINATION_CHAIN'
  deadline: string // ISO 8601
}

export type QuoteResponse = {
  quote: {
    amountIn: string
    amountInFormatted: string
    amountInUsd: string
    amountOut: string
    amountOutFormatted: string
    amountOutUsd: string
    minAmountOut: string
    timeEstimate: number
    depositAddress?: string
    deadline?: string
  }
  quoteRequest: QuoteRequest
  correlationId: string
}

export type SwapStatus =
  | 'PENDING_DEPOSIT'
  | 'KNOWN_DEPOSIT_TX'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'INCOMPLETE_DEPOSIT'
  | 'REFUNDED'
  | 'FAILED'

type ChainTx = { hash: string; explorerUrl: string }

export type StatusResponse = {
  status: SwapStatus
  updatedAt: string
  swapDetails: {
    amountOut?: string
    amountOutFormatted?: string
    amountOutUsd?: string
    refundedAmountFormatted?: string
    refundReason?: string
    originChainTxHashes: ChainTx[]
    destinationChainTxHashes: ChainTx[]
  }
}

export type OneClickOptions = {
  baseUrl?: string
  /** Optional 1Click JWT. Without it, quotes carry the unauthenticated fee. */
  jwt?: string
}

export type OneClick = ReturnType<typeof createOneClick>

export function createOneClick({ baseUrl = ONECLICK_URL, jwt }: OneClickOptions = {}) {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(jwt ? { authorization: `Bearer ${jwt}` } : {}),
        ...init?.headers,
      },
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      const message = (body as { message?: string } | null)?.message ?? res.statusText
      throw new Error(`1Click ${path.split('?')[0]} ${res.status}: ${message}`)
    }
    return body as T
  }

  let tokensCache: { at: number; tokens: IntentsToken[] } | null = null
  const TOKENS_TTL_MS = 5 * 60_000

  return {
    async tokens(): Promise<IntentsToken[]> {
      if (tokensCache && Date.now() - tokensCache.at < TOKENS_TTL_MS) return tokensCache.tokens
      const tokens = await call<IntentsToken[]>('/tokens')
      tokensCache = { at: Date.now(), tokens }
      return tokens
    },
    quote: (req: QuoteRequest) =>
      call<QuoteResponse>('/quote', { method: 'POST', body: JSON.stringify(req) }),
    status: (depositAddress: string) =>
      call<StatusResponse>(`/status?depositAddress=${encodeURIComponent(depositAddress)}`),
    submitDeposit: (depositAddress: string, txHash: string) =>
      call<unknown>('/deposit/submit', {
        method: 'POST',
        body: JSON.stringify({ depositAddress, txHash }),
      }),
  }
}

/** Terminal states: polling can stop. */
export const isFinalStatus = (s: SwapStatus) =>
  s === 'SUCCESS' || s === 'REFUNDED' || s === 'FAILED'
