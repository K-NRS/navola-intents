#!/usr/bin/env bun
// Price a cross-chain swap on NEAR Intents. Dry quote only: nothing is signed, nothing moves.
// Usage: bun run quote <amount> <FROM[:chain]> <TO[:chain]> --recipient <addr> --refund <addr>
import { parseArgs } from 'node:util'
import { createOneClick } from './oneclick'
import { getIntentsQuote } from './quote'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    recipient: { type: 'string' },
    refund: { type: 'string' },
    slippage: { type: 'string' },
    json: { type: 'boolean' },
  },
})

const [amount, from, to] = positionals
if (!amount || !from || !to || !values.recipient || !values.refund) {
  console.error(
    'Usage: bun run quote <amount> <FROM[:chain]> <TO[:chain]> --recipient <addr> --refund <addr> [--slippage <bps>] [--json]\n' +
      'Example: bun run quote 0.1 SOL:SOLANA USDC:BASE --recipient 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --refund So11111111111111111111111111111111111111112',
  )
  process.exit(2)
}

const split = (s: string) => {
  const [symbol, chain] = s.split(':')
  return { symbol: symbol!, chain }
}

const q = await getIntentsQuote(createOneClick({ jwt: process.env.ONECLICK_JWT }), {
  from: { ...split(from), amount },
  to: split(to),
  recipient: values.recipient,
  refundTo: values.refund,
  slippageBps: values.slippage ? Number(values.slippage) : undefined,
  dry: true,
})

if (values.json) {
  console.log(JSON.stringify(q, null, 2))
} else {
  const pct = q.usdIn > 0 ? ((q.feeUsd / q.usdIn) * 100).toFixed(2) : '0'
  console.log(`NEAR Intents quote (dry, nothing moved)
  send     ${q.fromToken.amount} ${q.fromToken.symbol} on ${q.fromToken.chain}   ($${q.usdIn.toFixed(2)})
  receive  ${q.toToken.amount} ${q.toToken.symbol} on ${q.toToken.chain}   ($${q.usdOut.toFixed(2)})
  cost     $${q.feeUsd.toFixed(2)} (${pct}%)   eta ~${q.etaSeconds}s   slippage ${q.slippageBps / 100}%`)
}
