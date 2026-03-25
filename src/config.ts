import { PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

/** По умолчанию локальный валидатор (`solana-test-validator`). Переопредели через `VITE_RPC_URL`. */
export const RPC_ENDPOINT =
  import.meta.env.VITE_RPC_URL ?? 'https://api.devnet.solana.com'

export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID ??
    'FZ2WxC1EjKQQxZxc2EGGWRu5JiPvu5eGtMgUoT8XjT2D',
)

export const KPI_TOKEN_MINT = new PublicKey(
  import.meta.env.VITE_TOKEN_MINT ??
    'CQRGsYL2ntzGVboKcBhzPfrNCVaJeGHtHNrvqGefKqMX',
)

export { TOKEN_PROGRAM_ID }

/** Лимиты как в контракте: `topic.len()` и `description.len()` в байтах. */
export const MAX_TOPIC_BYTES = 200
export const MAX_DESCRIPTION_BYTES = 800

export function txExplorerUrl(signature: string): string {
  const u = RPC_ENDPOINT.toLowerCase()
  if (u.includes('127.0.0.1') || u.includes('localhost')) {
    const custom = encodeURIComponent(RPC_ENDPOINT)
    return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${custom}`
  }
  if (u.includes('devnet')) {
    return `https://solscan.io/tx/${signature}?cluster=devnet`
  }
  if (u.includes('testnet')) {
    return `https://solscan.io/tx/${signature}?cluster=testnet`
  }
  return `https://solscan.io/tx/${signature}`
}
