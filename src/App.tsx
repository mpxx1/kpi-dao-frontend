import { type BN } from '@coral-xyz/anchor'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { type PublicKey } from '@solana/web3.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CreateProposalModal } from './components/CreateProposalModal'
import { ProposalCard } from './components/ProposalCard'
import { RPC_ENDPOINT } from './config'
import { useKpiDaoProgram } from './hooks/useKpiDaoProgram'
import './App.css'

type ProposalAcc = {
  topic: string
  description: string
  yesVotes: BN
  noVotes: BN
  deadline: BN
  executed: boolean
}

type ProposalRow = {
  publicKey: PublicKey
  account: ProposalAcc
}

export default function App() {
  const program = useKpiDaoProgram()
  const [search, setSearch] = useState('')
  const [proposals, setProposals] = useState<ProposalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void program.account.proposal
      .all()
      .then((rows) => {
        if (cancelled) return
        const sorted = [...rows].sort((a, b) =>
          b.account.deadline.cmp(a.account.deadline),
        )
        setProposals(sorted as ProposalRow[])
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) setProposals([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [program, refreshKey])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return proposals
    return proposals.filter(
      (r) =>
        r.account.topic.toLowerCase().includes(q) ||
        r.account.description.toLowerCase().includes(q),
    )
  }, [proposals, search])

  return (
    <div className="dao-app">
      <header className="dao-header">
        <div>
          <h1>KPI DAO</h1>
          <p className="dao-sub">
            Голосования по весу KPI-токена. RPC:{' '}
            <code>{RPC_ENDPOINT}</code>
          </p>
        </div>
        <WalletMultiButton />
      </header>

      <div className="dao-toolbar">
        <input
          type="search"
          className="dao-search"
          placeholder="Поиск по теме или описанию…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Поиск"
        />
        <button
          type="button"
          className="dao-btn primary"
          onClick={() => setCreateOpen(true)}
        >
          Создать голосование
        </button>
      </div>

      {loading ? (
        <p className="dao-muted">Загрузка списка…</p>
      ) : filtered.length === 0 ? (
        <p className="dao-muted">Нет голосований по текущему фильтру.</p>
      ) : (
        <ul className="dao-list">
          {filtered.map(({ publicKey, account }) => (
            <li key={publicKey.toBase58()}>
              <ProposalCard
                program={program}
                proposalPk={publicKey}
                account={account}
                onDone={refresh}
              />
            </li>
          ))}
        </ul>
      )}

      {createOpen ? (
        <CreateProposalModal
          program={program}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            refresh()
          }}
        />
      ) : null}
    </div>
  )
}
