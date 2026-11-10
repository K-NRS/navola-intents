// The AI tool must only ever return dry quotes (no deposit address = no way to move funds).
import { expect, test } from 'bun:test'
import { createOneClick } from '../src/oneclick'
import { createIntentsQuoteTool } from '../src/tool'

test('AI tool returns a priced, dry quote with no deposit address', async () => {
  const t = createIntentsQuoteTool(createOneClick())
  const q = await t.execute!(
    {
      fromToken: { symbol: 'SOL', chain: 'SOLANA', amount: '0.1' },
      toToken: { symbol: 'USDC', chain: 'BASE' },
      recipient: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      refundTo: 'So11111111111111111111111111111111111111112',
    },
    { toolCallId: 't1', messages: [] },
  )
  expect(q).toMatchObject({ provider: 'near-intents' })
  expect((q as { depositAddress?: string }).depositAddress).toBeUndefined()
  expect((q as { usdOut: number }).usdOut).toBeGreaterThan(0)
})
