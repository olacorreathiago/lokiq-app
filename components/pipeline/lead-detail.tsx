'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Lead, LeadEvent, LeadStage } from '@/lib/types'
import { STAGES, stageLabel } from '@/lib/stages'
import { Timeline } from '@/components/pipeline/timeline'
import { ReportModal } from '@/components/search/report-modal'

type Tab = 'timeline' | 'stage' | 'nota' | 'dados'

interface LeadDetailProps {
  lead: Lead
  onClose: () => void
  onStageChanged: (leadId: string, stage: LeadStage) => void
  onLeadUpdated: (lead: Lead) => void
}

interface ReportModalState {
  data: Record<string, unknown> | null
  loading: boolean
  error: string | null
}

const NOTE_TYPES = [
  { id: 'note_added', label: 'Nota' },
  { id: 'call_logged', label: 'Chamada' },
  { id: 'meeting_logged', label: 'Reunião' },
  { id: 'objection_logged', label: 'Objeção' },
] as const

export function LeadDetail({ lead, onClose, onStageChanged, onLeadUpdated }: LeadDetailProps) {
  const [tab, setTab] = useState<Tab>('timeline')

  const [reportModal, setReportModal] = useState<ReportModalState | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)

  const [events, setEvents] = useState<LeadEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)

  const [targetStage, setTargetStage] = useState<LeadStage | null>(null)
  const [reason, setReason] = useState('')
  const [moving, setMoving] = useState(false)

  const [noteType, setNoteType] = useState<string>('note_added')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const [actionError, setActionError] = useState('')

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${lead.id}/events`)
      const data = await res.json()
      if (res.ok) setEvents(data.events ?? [])
    } finally {
      setEventsLoading(false)
    }
  }, [lead.id])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const moveStage = useCallback(async () => {
    if (!targetStage) return
    if (targetStage === 'discarded' && !reason.trim()) {
      setActionError('Descartar um lead requer motivo.')
      return
    }

    setMoving(true)
    setActionError('')
    try {
      const res = await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: targetStage,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao mover stage')

      onStageChanged(lead.id, targetStage)
      setTargetStage(null)
      setReason('')
      setTab('timeline')
      await loadEvents()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setMoving(false)
    }
  }, [lead.id, targetStage, reason, onStageChanged, loadEvents])

  const saveNote = useCallback(async () => {
    if (!noteTitle.trim()) return

    setSavingNote(true)
    setActionError('')
    try {
      const res = await fetch(`/api/leads/${lead.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: noteType,
          title: noteTitle.trim(),
          body: noteBody.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao guardar nota')

      setNoteTitle('')
      setNoteBody('')
      setTab('timeline')
      await loadEvents()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setSavingNote(false)
    }
  }, [lead.id, noteType, noteTitle, noteBody, loadEvents])

  const generateReport = useCallback(async () => {
    setGeneratingReport(true)
    setReportModal({ data: null, loading: true, error: null })
    try {
      const res = await fetch(`/api/leads/${lead.id}/report`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Erro ao gerar relatório')
      setReportModal({ data: data.report, loading: false, error: null })
      await loadEvents()
    } catch (e) {
      setReportModal({
        data: null,
        loading: false,
        error: e instanceof Error ? e.message : 'Erro desconhecido',
      })
    } finally {
      setGeneratingReport(false)
    }
  }, [lead.id, loadEvents])

  const refreshData = useCallback(async () => {
    setRefreshing(true)
    setActionError('')
    try {
      const res = await fetch(`/api/leads/${lead.id}/refresh`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Erro ao actualizar dados')
      onLeadUpdated(data.lead as Lead)
      setTab('timeline')
      await loadEvents()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setRefreshing(false)
    }
  }, [lead.id, onLeadUpdated, loadEvents])

  const viewReport = useCallback((event: LeadEvent) => {
    const stored = (event.metadata as { report?: Record<string, unknown> } | null)?.report
    if (stored) {
      setReportModal({ data: stored, loading: false, error: null })
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-base font-semibold text-neutral-100">{lead.name}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 text-lg leading-none">✕</button>
        </div>
        <p className="text-xs text-neutral-500 mb-3">
          {lead.type} · {stageLabel(lead.stage)} · Score {lead.opp_score}
        </p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={generateReport}
            disabled={generatingReport}
            className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {generatingReport ? 'A gerar...' : 'Gerar relatório'}
          </button>
          <button
            onClick={refreshData}
            disabled={refreshing}
            title="Volta a consultar o Google Maps e recalcula o score (~€0.035)"
            className="flex-1 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            {refreshing ? 'A actualizar...' : 'Actualizar dados'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-neutral-800/50 p-1 mb-4">
          {([
            ['timeline', 'Timeline'],
            ['stage', 'Mover'],
            ['nota', 'Nota'],
            ['dados', 'Dados'],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setActionError('') }}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                tab === id ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 mb-4">
            <p className="text-xs text-rose-400">{actionError}</p>
          </div>
        )}

        {tab === 'timeline' && <Timeline events={events} loading={eventsLoading} onViewReport={viewReport} />}

        {tab === 'stage' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {STAGES.filter((s) => s.id !== lead.stage).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setTargetStage(s.id)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    targetStage === s.id
                      ? `${s.accent} bg-neutral-800`
                      : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={targetStage === 'discarded' ? 'Motivo (obrigatório para descartar)' : 'Motivo (opcional)'}
              rows={2}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
            />

            <button
              onClick={moveStage}
              disabled={!targetStage || moving}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {moving ? 'A mover...' : targetStage ? `Mover para ${stageLabel(targetStage)}` : 'Escolhe o stage'}
            </button>
          </div>
        )}

        {tab === 'nota' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tipo</label>
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
              >
                {NOTE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Título"
              maxLength={200}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
            />
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Detalhes (opcional)"
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
            />
            <button
              onClick={saveNote}
              disabled={!noteTitle.trim() || savingNote}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {savingNote ? 'A guardar...' : 'Guardar nota'}
            </button>
          </div>
        )}

        {tab === 'dados' && (
          <dl className="space-y-2 text-sm">
            {([
              ['Morada', lead.address || '—'],
              ['Telefone', lead.phone ?? '—'],
              ['Rating', lead.rating !== null ? `${lead.rating.toFixed(1)} (${lead.review_count ?? 0} reviews)` : '—'],
              ['Website', lead.website_presence === 'website' ? 'Site próprio' : lead.website_presence === 'social' ? 'Só rede social' : 'Sem website'],
              ['Captura', lead.capture_mode],
              ['Criado', new Date(lead.created_at).toLocaleDateString('pt-PT')],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-neutral-800/60 pb-2">
                <dt className="text-xs text-neutral-500">{label}</dt>
                <dd className="text-xs text-neutral-200 text-right">{value}</dd>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-medium text-white hover:bg-blue-500 transition-colors"
                >
                  Ligar agora
                </a>
              )}
              {lead.gmaps_uri && (
                <a
                  href={lead.gmaps_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg border border-neutral-700 px-3 py-2 text-center text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
                >
                  Maps
                </a>
              )}
            </div>
          </dl>
        )}
      </div>

      {reportModal && (
        <ReportModal
          report={reportModal.data as Parameters<typeof ReportModal>[0]['report']}
          businessName={lead.name}
          loading={reportModal.loading}
          error={reportModal.error}
          onClose={() => setReportModal(null)}
        />
      )}
    </div>
  )
}
