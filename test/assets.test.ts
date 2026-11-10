import { describe, expect, test } from 'bun:test'
import { findAsset, toBaseUnits, toIntentsChain, type IntentsToken } from '../src/assets'

const tokens: IntentsToken[] = [
  { assetId: 'nep141:sol.omft.near', symbol: 'SOL', blockchain: 'sol', decimals: 9, price: 84 },
  {
    assetId: 'nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near',
    symbol: 'USDC',
    blockchain: 'sol',
    decimals: 6,
    price: 1,
    contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  {
    assetId: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
    symbol: 'USDC',
    blockchain: 'base',
    decimals: 6,
    price: 1,
    contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  },
  { assetId: 'nep141:btc.omft.near', symbol: 'BTC', blockchain: 'btc', decimals: 8, price: 89000 },
]

describe('toIntentsChain', () => {
  test('maps Navola/Rango chain names to 1Click chain codes', () => {
    expect(toIntentsChain('SOLANA')).toBe('sol')
    expect(toIntentsChain('ETH')).toBe('eth')
    expect(toIntentsChain('ETHEREUM')).toBe('eth')
    expect(toIntentsChain('BASE')).toBe('base')
    expect(toIntentsChain('BSC')).toBe('bsc')
    expect(toIntentsChain('BTC')).toBe('btc')
    expect(toIntentsChain('bitcoin')).toBe('btc')
  })

  test('passes a 1Click chain code through unchanged', () => {
    expect(toIntentsChain('sol')).toBe('sol')
    expect(toIntentsChain('xrp')).toBe('xrp')
  })
})

describe('findAsset', () => {
  test('picks the token on the requested chain', () => {
    expect(findAsset(tokens, 'usdc', 'BASE')?.assetId).toBe(
      'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
    )
    expect(findAsset(tokens, 'USDC', 'SOLANA')?.blockchain).toBe('sol')
  })

  test('without a chain, prefers the token native chain', () => {
    expect(findAsset(tokens, 'BTC')?.blockchain).toBe('btc')
    expect(findAsset(tokens, 'SOL')?.blockchain).toBe('sol')
  })

  test('returns undefined when the token is not on that chain', () => {
    expect(findAsset(tokens, 'BTC', 'BASE')).toBeUndefined()
  })
})

describe('toBaseUnits', () => {
  test('converts human amounts to integer base units', () => {
    expect(toBaseUnits('0.1', 9)).toBe('100000000')
    expect(toBaseUnits('1.5', 6)).toBe('1500000')
    expect(toBaseUnits('25', 6)).toBe('25000000')
  })

  test('rejects more decimals than the token has', () => {
    expect(() => toBaseUnits('0.0000001', 6)).toThrow()
  })

  test('rejects zero, negative, and malformed amounts', () => {
    expect(() => toBaseUnits('0', 9)).toThrow()
    expect(() => toBaseUnits('-1', 9)).toThrow()
    expect(() => toBaseUnits('1e5', 9)).toThrow()
  })
})
