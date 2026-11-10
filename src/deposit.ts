import {
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'

/**
 * An unsigned deposit transaction in the shape Navola's swap execution already signs
 * (the same shape Rango returns): Solana as serialized bytes, EVM as `{to, value, data}`.
 */
export type DepositTx =
  | { type: 'SOLANA'; serializedMessage: number[] }
  | { type: 'EVM'; to: string; value: string; data: '0x' }

const EVM_CHAINS = new Set(['eth', 'base', 'arb', 'op', 'pol', 'bsc', 'avax', 'gnosis', 'scroll', 'bera'])

export type DepositParams = {
  /** 1Click chain code of the origin asset. */
  chain: string
  from: string
  depositAddress: string
  /** Amount in base units (lamports, wei), exactly as quoted. */
  amount: string
  /** Required for Solana. */
  recentBlockhash?: string
}

/**
 * Builds the native-coin transfer to a 1Click deposit address.
 * Token (SPL / ERC-20) deposits are deliberately out of scope: native SOL and ETH-likes only.
 */
export function buildDepositTx(p: DepositParams): DepositTx {
  if (p.chain === 'sol') {
    if (!p.recentBlockhash) throw new Error('Solana deposit needs a recent blockhash')
    const payer = new PublicKey(p.from)
    const message = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: p.recentBlockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: new PublicKey(p.depositAddress),
          lamports: BigInt(p.amount),
        }),
      ],
    }).compileToV0Message()
    return { type: 'SOLANA', serializedMessage: Array.from(new VersionedTransaction(message).serialize()) }
  }
  if (EVM_CHAINS.has(p.chain)) {
    return { type: 'EVM', to: p.depositAddress, value: p.amount, data: '0x' }
  }
  throw new Error(`No native deposit builder for chain "${p.chain}"`)
}
