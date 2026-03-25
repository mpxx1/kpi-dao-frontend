import { useMemo } from 'react'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { SystemProgram } from '@solana/web3.js'
import idl from '../idl/kpi_dao.json'
import type { KpiDao } from '../types/kpi_dao'

const disconnectedWallet = {
  publicKey: SystemProgram.programId,
  signTransaction: async () => {
    throw new Error('Подключите кошелёк')
  },
  signAllTransactions: async () => {
    throw new Error('Подключите кошелёк')
  },
}

export function useKpiDaoProgram(): Program<KpiDao> {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const walletKey = wallet?.publicKey?.toBase58() ?? ''

  return useMemo(() => {
    const w = wallet ?? disconnectedWallet
    const provider = new AnchorProvider(connection, w, {
      commitment: 'confirmed',
    })
    return new Program(idl as unknown as KpiDao, provider)
    // walletKey отражает подключение; ссылка на `wallet` от контекста может меняться каждый рендер
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, walletKey])
}
