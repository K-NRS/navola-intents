/** A token as returned by the 1Click `GET /tokens` endpoint. */
export type IntentsToken = {
  assetId: string
  symbol: string
  blockchain: string
  decimals: number
  price?: number
  contractAddress?: string
}

/**
 * Chain names used by Navola (Rango naming) mapped to 1Click chain codes.
 * Anything not listed is assumed to already be a 1Click code (e.g. `xrp`).
 */
const CHAIN_ALIASES: Record<string, string> = {
  SOLANA: 'sol',
  ETH: 'eth',
  ETHEREUM: 'eth',
  BASE: 'base',
  ARBITRUM: 'arb',
  OPTIMISM: 'op',
  POLYGON: 'pol',
  BSC: 'bsc',
  AVAX_CCHAIN: 'avax',
  AVALANCHE: 'avax',
  GNOSIS: 'gnosis',
  SCROLL: 'scroll',
  BERACHAIN: 'bera',
  BTC: 'btc',
  BITCOIN: 'btc',
  DOGE: 'doge',
  DOGECOIN: 'doge',
  LTC: 'ltc',
  LITECOIN: 'ltc',
  BCH: 'bch',
  XRP: 'xrp',
  RIPPLE: 'xrp',
  TRON: 'tron',
  TON: 'ton',
  SUI: 'sui',
  NEAR: 'near',
  STELLAR: 'stellar',
  ZCASH: 'zec',
  CARDANO: 'cardano',
  APTOS: 'aptos',
}

export function toIntentsChain(chain: string): string {
  return CHAIN_ALIASES[chain.toUpperCase()] ?? chain.toLowerCase()
}

/** The chain a symbol natively lives on, used when the caller names no chain. */
const NATIVE_CHAIN: Record<string, string> = {
  SOL: 'sol',
  ETH: 'eth',
  BTC: 'btc',
  BNB: 'bsc',
  POL: 'pol',
  AVAX: 'avax',
  XRP: 'xrp',
  DOGE: 'doge',
  LTC: 'ltc',
  BCH: 'bch',
  TRX: 'tron',
  TON: 'ton',
  SUI: 'sui',
  NEAR: 'near',
  ZEC: 'zec',
  ADA: 'cardano',
}

export function findAsset(
  tokens: IntentsToken[],
  symbol: string,
  chain?: string,
): IntentsToken | undefined {
  const sym = symbol.toUpperCase()
  const wanted = chain ? toIntentsChain(chain) : NATIVE_CHAIN[sym]
  const matches = tokens.filter((t) => t.symbol.toUpperCase() === sym)
  if (wanted) return matches.find((t) => t.blockchain === wanted)
  return matches.length === 1 ? matches[0] : undefined
}

/** "1.5" with 6 decimals → "1500000". Throws on anything but a positive plain decimal. */
export function toBaseUnits(amount: string, decimals: number): string {
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error(`Invalid amount "${amount}"`)
  const [whole, fraction = ''] = amount.split('.')
  if (fraction.length > decimals) {
    throw new Error(`Amount "${amount}" has more than ${decimals} decimals`)
  }
  const base = BigInt(whole + fraction.padEnd(decimals, '0'))
  if (base <= BigInt(0)) throw new Error(`Amount must be greater than zero, got "${amount}"`)
  return base.toString()
}
