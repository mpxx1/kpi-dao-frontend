import { useState } from 'react'
import { BN, type Program } from '@coral-xyz/anchor'
import type { KpiDao } from '../types/kpi_dao'
import { useWallet } from '@solana/wallet-adapter-react'
import { Keypair, SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import {
  KPI_TOKEN_MINT,
  MAX_DESCRIPTION_BYTES,
  MAX_TOPIC_BYTES,
  TOKEN_PROGRAM_ID,
  txExplorerUrl,
} from '../config'

type Props = {
  program: Program<KpiDao>
  onClose: () => void
  onCreated: () => void
}

export function CreateProposalModal({ program, onClose, onCreated }: Props) {
  const { publicKey } = useWallet()
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [durationSec, setDurationSec] = useState('3600')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!publicKey) {
      setError('Подключите кошелёк.')
      return
    }
    const tBytes = new TextEncoder().encode(topic.trim()).length
    const dBytes = new TextEncoder().encode(description.trim()).length
    if (tBytes === 0) {
      setError('Укажите тему.')
      return
    }
    if (tBytes > MAX_TOPIC_BYTES) {
      setError(`Тема слишком длинная (макс. ${MAX_TOPIC_BYTES} байт UTF-8).`)
      return
    }
    if (dBytes > MAX_DESCRIPTION_BYTES) {
      setError(
        `Описание слишком длинное (макс. ${MAX_DESCRIPTION_BYTES} байт UTF-8).`,
      )
      return
    }
    const dur = Number.parseInt(durationSec, 10)
    if (!Number.isFinite(dur) || dur <= 0) {
      setError('Длительность должна быть положительным числом (секунды).')
      return
    }

    const userToken = getAssociatedTokenAddressSync(
      KPI_TOKEN_MINT,
      publicKey,
      false,
      TOKEN_PROGRAM_ID,
    )

    const proposalKp = Keypair.generate()
    setBusy(true)
    try {
      const sig = await program.methods
        .createProposal(topic.trim(), description.trim(), new BN(dur))
        .accounts({
          proposal: proposalKp.publicKey,
          user: publicKey,
          userToken,
          systemProgram: SystemProgram.programId,
        } as never)
        .signers([proposalKp])
        .rpc()
      console.info('create_proposal', sig, txExplorerUrl(sig))
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dao-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dao-modal"
        role="dialog"
        aria-labelledby="create-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="create-title">Новое голосование</h2>
        <label className="dao-field">
          <span>Тема</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Краткая тема"
            disabled={busy}
          />
        </label>
        <label className="dao-field">
          <span>Вопрос / описание</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Формулировка голосования"
            rows={4}
            disabled={busy}
          />
        </label>
        <label className="dao-field">
          <span>Длительность (секунды)</span>
          <input
            type="number"
            min={1}
            value={durationSec}
            onChange={(e) => setDurationSec(e.target.value)}
            disabled={busy}
          />
        </label>
        {error ? <p className="dao-error">{error}</p> : null}
        <div className="dao-modal-actions">
          <button type="button" className="dao-btn" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button
            type="button"
            className="dao-btn primary"
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy ? 'Отправка…' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}
