'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Lead, LeadStage } from '@/lib/types'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import { LeadDetail } from '@/components/pipeline/lead-detail'

type Status = 'loading' | 'done' | 'error'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Lead | null>(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    fetch('/api/leads')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erro ao carregar leads')
        if (!active) return
        setLeads(data.leads ?? [])
        setError('')
        setStatus('done')
      })
      .catch((e: unknown) => {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Erro desconhecido')
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const refresh = useCallback(() => {
    setStatus('loading')
    setError('')
    setReloadKey((k) => k + 1)
  }, [])

  const handleStageChanged = useCallback((leadId: string, stage: LeadStage) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)))
    setSelected((prev) => (prev && prev.id === leadId ? { ...prev, stage } : prev))
  }, [])

  const handleLeadUpdated = useCallback((lead: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l)))
    setSelected((prev) => (prev && prev.id === lead.id ? lead : prev))
  }, [])

  const [moveError, setMoveError] = useState('')

  const moveStage = useCallback(async (leadId: string, stage: LeadStage, reason?: string) => {
    setMoveError('')
    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, ...(reason ? { reason } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao mover lead')
      handleStageChanged(leadId, stage)
    } catch (e) {
      setMoveError(e instanceof Error ? e.message : 'Erro desconhecido')
    }
  }, [handleStageChanged])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {status === 'done' ? `${leads.length} leads no pipeline` : 'Gestão de leads por stage'}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={status === 'loading'}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          Actualizar
        </button>
      </header>

      {status === 'loading' && (
        <p className="py-12 text-center text-sm text-neutral-500">A carregar pipeline...</p>
      )}

      {status === 'error' && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}

      {status === 'done' && leads.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-neutral-500">Ainda não tens leads guardados.</p>
          <a href="/search" className="mt-2 inline-block text-xs text-blue-400 hover:text-blue-300">
            Ir para a pesquisa →
          </a>
        </div>
      )}

      {moveError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 mb-4">
          <p className="text-sm text-rose-400">{moveError}</p>
          <button onClick={() => setMoveError('')} className="text-rose-400/60 hover:text-rose-300 text-sm leading-none">✕</button>
        </div>
      )}

      {status === 'done' && leads.length > 0 && (
        <KanbanBoard leads={leads} onSelect={setSelected} onMoveStage={moveStage} />
      )}

      {selected && (
        <LeadDetail
          lead={selected}
          onClose={() => setSelected(null)}
          onStageChanged={handleStageChanged}
          onLeadUpdated={handleLeadUpdated}
        />
      )}
    </div>
  )
}
