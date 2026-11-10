// Live tests against the public 1Click API. Every quote is `dry: true`: no funds move.
import { describe, expect, test } from 'bun:test'
import { createOneClick } from '../src/oneclick'
import { getIntentsQuote } from '../src/quote'

const oneClick = createOneClick()
const EVM_RECIPIENT = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const SOL_REFUND = 'So11111111111111111111111111111111111111112'
const BTC_RECIPIENT = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'

describe('1Click live', () => {
  test('lists supported tokens including SOL and native BTC', async () => {
    const tokens = await oneClick.tokens()
    expect(tokens.length).toBeGreaterThan(50)
    expect(tokens.some((t) => t.assetId === 'nep141:sol.omft.near')).toBe(true)
    expect(tokens.some((t) => t.blockchain === 'btc' && t.symbol === 'BTC')).toBe(true)
  })

  test('dry quote: 0.1 SOL to USDC on Base', async () => {
    const q = await getIntentsQuote(oneClick, {
      from: { symbol: 'SOL', chain: 'SOLANA', amount: '0.1' },
      to: { symbol: 'USDC', chain: 'BASE' },
      recipient: EVM_RECIPIENT,
      refundTo: SOL_REFUND,
      dry: true,
    })
    expect(q.provider).toBe('near-intents')
    expect(q.fromToken).toMatchObject({ symbol: 'SOL', chain: 'sol', amountBase: '100000000' })
    expect(q.toToken).toMatchObject({ symbol: 'USDC', chain: 'base' })
    expect(Number(q.toToken.amount)).toBeGreaterThan(0)
    expect(q.usdIn).toBeGreaterThan(0)
    expect(q.feeUsd).toBeGreaterThanOrEqual(0)
    expect(q.etaSeconds).toBeGreaterThan(0)
    expect(q.depositAddress).toBeUndefined() // dry quotes never open a deposit
  })

  test('dry quote: SOL to native BTC (a route Rango-only Navola refuses)', async () => {
    const q = await getIntentsQuote(oneClick, {
      from: { symbol: 'SOL', chain: 'SOLANA', amount: '1' },
      to: { symbol: 'BTC', chain: 'BTC' },
      recipient: BTC_RECIPIENT,
      refundTo: SOL_REFUND,
      dry: true,
    })
    expect(q.toToken.chain).toBe('btc')
    expect(Number(q.toToken.amount)).toBeGreaterThan(0)
  })

  test('an invalid recipient fails loudly with the API message', async () => {
    await expect(
      getIntentsQuote(oneClick, {
        from: { symbol: 'SOL', chain: 'SOLANA', amount: '0.1' },
        to: { symbol: 'USDC', chain: 'BASE' },
        recipient: 'not-an-address',
        refundTo: SOL_REFUND,
        dry: true,
      }),
    ).rejects.toThrow(/recipient/i)
  })

  test('an unknown token fails before any API quote call', async () => {
    await expect(
      getIntentsQuote(oneClick, {
        from: { symbol: 'NOPE_TOKEN', chain: 'SOLANA', amount: '1' },
        to: { symbol: 'USDC', chain: 'BASE' },
        recipient: EVM_RECIPIENT,
        refundTo: SOL_REFUND,
        dry: true,
      }),
    ).rejects.toThrow(/NOPE_TOKEN/)
  })
})
