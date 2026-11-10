import { describe, expect, test } from 'bun:test'
import { Keypair, SystemInstruction, SystemProgram, VersionedTransaction } from '@solana/web3.js'
import { buildDepositTx } from '../src/deposit'

const from = Keypair.generate().publicKey.toBase58()
const depositAddress = Keypair.generate().publicKey.toBase58()
const blockhash = Keypair.generate().publicKey.toBase58() // any base58 32-byte value

describe('buildDepositTx: Solana native SOL', () => {
  const tx = buildDepositTx({
    chain: 'sol',
    from,
    depositAddress,
    amount: '100000000',
    recentBlockhash: blockhash,
  })

  test('has the shape Navola swap execution signs', () => {
    expect(tx.type).toBe('SOLANA')
    if (tx.type !== 'SOLANA') throw new Error('unreachable')
    expect(Array.isArray(tx.serializedMessage)).toBe(true)
  })

  test('is one unsigned transfer of exactly the quoted lamports to the deposit address', () => {
    if (tx.type !== 'SOLANA') throw new Error('unreachable')
    const decoded = VersionedTransaction.deserialize(Uint8Array.from(tx.serializedMessage))
    const msg = decoded.message
    expect(msg.recentBlockhash).toBe(blockhash)
    expect(msg.staticAccountKeys[0]!.toBase58()).toBe(from) // fee payer = sender
    expect(msg.compiledInstructions).toHaveLength(1)

    const ix = msg.compiledInstructions[0]!
    const keys = msg.staticAccountKeys
    expect(keys[ix.programIdIndex]!.equals(SystemProgram.programId)).toBe(true)
    const params = SystemInstruction.decodeTransfer({
      programId: SystemProgram.programId,
      keys: ix.accountKeyIndexes.map((i) => ({
        pubkey: keys[i]!,
        isSigner: msg.isAccountSigner(i),
        isWritable: msg.isAccountWritable(i),
      })),
      data: Buffer.from(ix.data),
    })
    expect(params.fromPubkey.toBase58()).toBe(from)
    expect(params.toPubkey.toBase58()).toBe(depositAddress)
    expect(params.lamports).toBe(100000000n)
  })
})

describe('buildDepositTx: EVM native', () => {
  test('is a plain value transfer to the deposit address', () => {
    const tx = buildDepositTx({
      chain: 'base',
      from: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      depositAddress: '0x1111111111111111111111111111111111111111',
      amount: '1000000000000000',
    })
    expect(tx).toEqual({
      type: 'EVM',
      to: '0x1111111111111111111111111111111111111111',
      value: '1000000000000000',
      data: '0x',
    })
  })
})

describe('buildDepositTx: unsupported', () => {
  test('refuses a chain it cannot build a native deposit for', () => {
    expect(() =>
      buildDepositTx({ chain: 'btc', from: 'x', depositAddress: 'y', amount: '1' }),
    ).toThrow(/btc/)
  })

  test('refuses Solana without a blockhash', () => {
    expect(() =>
      buildDepositTx({ chain: 'sol', from, depositAddress, amount: '1' }),
    ).toThrow(/blockhash/)
  })
})
