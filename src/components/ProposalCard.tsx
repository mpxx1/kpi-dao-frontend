import { type BN, type Program } from '@coral-xyz/anchor'
import type { KpiDao } from '../types/kpi_dao'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useCallback, useEffect, useState } from 'react'
import { getAssociatedTokenAddressSync, getAccount } from '@solana/spl-token'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import {
  KPI_TOKEN_MINT,
  TOKEN_PROGRAM_ID,
  txExplorerUrl,
} from '../config'

type ProposalAcc = {
  topic: string
  description: string
  yesVotes: BN
  noVotes: BN
  deadline: BN
  executed: boolean
}

type VoteAcc = {
  amount: BN
  votedYes: boolean
  withdrawn: boolean
}

type Props = {
  program: Program<KpiDao>
  proposalPk: PublicKey
  account: ProposalAcc
  onDone: () => void
}

function pdas(programId: PublicKey, proposalPk: PublicKey, userPk: PublicKey) {
  const [voteAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('vote'), proposalPk.toBuffer(), userPk.toBuffer()],
    programId,
  )
  const [vault] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), proposalPk.toBuffer()],
    programId,
  )
  const [vaultAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault_auth'), proposalPk.toBuffer()],
    programId,
  )
  return { voteAccount, vault, vaultAuthority }
}

export function ProposalCard({ program, proposalPk, account, onDone }: Props) {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  const [tokenAmount, setTokenAmount] = useState<bigint>(0n)
  const [voteAcc, setVoteAcc] = useState<VoteAcc | null | undefined>(undefined)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const deadline = account.deadline.toNumber()
  const votingOpen = now < deadline && !account.executed
  const votingEnded = now >= deadline
  const canExecute = votingEnded && !account.executed

  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const loadUserState = useCallback(async () => {
    if (!publicKey) {
      setVoteAcc(null)
      setTokenAmount(0n)
      return
    }
    const userAta = getAssociatedTokenAddressSync(
      KPI_TOKEN_MINT,
      publicKey,
      false,
      TOKEN_PROGRAM_ID,
    )
    try {
      const ta = await getAccount(connection, userAta)
      setTokenAmount(ta.amount)
    } catch {
      setTokenAmount(0n)
    }
    const { voteAccount } = pdas(program.programId, proposalPk, publicKey)
    const va = await program.account.voteAccount.fetchNullable(voteAccount)
    if (va) {
      setVoteAcc({
        amount: va.amount,
        votedYes: va.votedYes,
        withdrawn: va.withdrawn,
      })
    } else {
      setVoteAcc(null)
    }
  }, [connection, program, proposalPk, publicKey])

  useEffect(() => {
    let cancelled = false
    setVoteAcc(undefined)
    void (async () => {
      try {
        await loadUserState()
      } catch {
        if (!cancelled) setVoteAcc(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadUserState])

  const run = async (label: string, fn: () => Promise<string>) => {
    setErr(null)
    setBusy(label)
    try {
      const sig = await fn()
      console.info(label, sig, txExplorerUrl(sig))
      await loadUserState()
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const onVote = (voteYes: boolean) => {
    if (!publicKey) return
    const userToken = getAssociatedTokenAddressSync(
      KPI_TOKEN_MINT,
      publicKey,
      false,
      TOKEN_PROGRAM_ID,
    )
    const { voteAccount, vault, vaultAuthority } = pdas(
      program.programId,
      proposalPk,
      publicKey,
    )
    return run('vote', () =>
      program.methods
        .vote(voteYes)
        .accounts({
          proposal: proposalPk,
          user: publicKey,
          voteAccount,
          userToken,
          vault,
          vaultAuthority,
          mint: KPI_TOKEN_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc(),
    )
  }

  const onExecute = () =>
    run('execute', () =>
      program.methods
        .executeProposal()
        .accounts({ proposal: proposalPk })
        .rpc(),
    )

  const onWithdraw = () => {
    if (!publicKey) return
    const userToken = getAssociatedTokenAddressSync(
      KPI_TOKEN_MINT,
      publicKey,
      false,
      TOKEN_PROGRAM_ID,
    )
    const { voteAccount, vault, vaultAuthority } = pdas(
      program.programId,
      proposalPk,
      publicKey,
    )
    return run('withdraw', () =>
      program.methods
        .withdraw()
        .accounts({
          proposal: proposalPk,
          voteAccount,
          user: publicKey,
          userToken,
          vault,
          vaultAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as never)
        .rpc(),
    )
  }

  const canVote =
    Boolean(publicKey) &&
    votingOpen &&
    tokenAmount > 0n &&
    voteAcc === null

  const showWithdraw =
    Boolean(publicKey) &&
    votingEnded &&
    voteAcc &&
    !voteAcc.withdrawn

  const fmtTime = (unix: number) =>
    new Date(unix * 1000).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  return (
    <article className="dao-card">
      <header className="dao-card-head">
        <h2>{account.topic}</h2>
        <span className="dao-pk" title={proposalPk.toBase58()}>
          {proposalPk.toBase58().slice(0, 4)}…{proposalPk.toBase58().slice(-4)}
        </span>
      </header>
      <p className="dao-desc">{account.description}</p>
      <div className="dao-stats">
        <span>
          <strong>За:</strong> {account.yesVotes.toString()}
        </span>
        <span>
          <strong>Против:</strong> {account.noVotes.toString()}
        </span>
        <span>
          <strong>До:</strong> {fmtTime(deadline)}
        </span>
        {account.executed ? (
          <span className="dao-badge done">Закрыто</span>
        ) : votingOpen ? (
          <span className="dao-badge open">Идёт голосование</span>
        ) : (
          <span className="dao-badge pending">Ожидает закрытия</span>
        )}
      </div>
      {account.executed && (
        <p className="dao-verdict">
          {account.yesVotes.isZero() && account.noVotes.isZero()
            ? 'Итог: сообщество воздержалось'
            : account.yesVotes.gt(account.noVotes)
              ? 'Итог: сообщество за'
              : account.noVotes.gt(account.yesVotes)
                ? 'Итог: сообщество против'
                : 'Итог: голоса разделились поровну'}
        </p>
      )}
      {publicKey && voteAcc ? (
        <p className="dao-voted">
          Ваш голос: <strong>{voteAcc.votedYes ? 'да' : 'нет'}</strong>, залочено
          токенов: {voteAcc.amount.toString()}
        </p>
      ) : null}
      {err ? <p className="dao-error">{err}</p> : null}
      <div className="dao-actions">
        <button
          type="button"
          className="dao-btn yes"
          disabled={!canVote || Boolean(busy)}
          title={
            !publicKey
              ? 'Подключите кошелёк'
              : tokenAmount === 0n
                ? 'Нужен баланс KPI на ATA'
                : voteAcc != null
                  ? 'Уже голосовали'
                  : !votingOpen
                    ? 'Голосование завершено'
                    : 'Голос «да» (весь баланс KPI)'
          }
          onClick={() => void onVote(true)}
        >
          {busy === 'vote' ? '…' : 'Да'}
        </button>
        <button
          type="button"
          className="dao-btn no"
          disabled={!canVote || Boolean(busy)}
          onClick={() => void onVote(false)}
        >
          {busy === 'vote' ? '…' : 'Нет'}
        </button>
        <button
          type="button"
          className="dao-btn"
          disabled={!canExecute || Boolean(busy)}
          title="Фиксирует результат (после дедлайна)"
          onClick={() => void onExecute()}
        >
          {busy === 'execute' ? '…' : 'Окончить голосование'}
        </button>
        <button
          type="button"
          className="dao-btn primary"
          disabled={!showWithdraw || Boolean(busy)}
          title="Вернуть KPI после дедлайна"
          onClick={() => void onWithdraw()}
        >
          {busy === 'withdraw' ? '…' : 'Вывести токены'}
        </button>
      </div>
    </article>
  )
}
