'use client'

import type { LeadEvent } from '@/lib/types'
import { stageLabel } from '@/lib/stages'
import type { LeadStage } from '@/lib/types'

interface TimelineProps {
  events: LeadEvent[]
  loading: boolean
  onViewReport?: (event: LeadEvent) => void
}

const EVENT_LABELS: Record<string, string> = {
  report_created: 'Relatório',
  demo_generated: 'Demo',
  stage_changed: 'Stage',
  note_added: 'Nota',
  call_logged: 'Chamada',
  meeting_logged: 'Reunião',
  objection_logged: 'Objeção',
  reminder_set: 'Lembrete',
  reminder_fired: 'Lembrete disparado',
  ai_suggestion: 'Sugestão IA',
  data_refreshed: 'Actualização',
}

const SOURCE_COLORS: Record<string, string> = {
  auto: 'bg-sky-500/15 text-sky-400',
  manual: 'bg-neutral-500/15 text-neutral-300',
  ai: 'bg-violet-500/15 text-violet-400',
  system: 'bg-amber-500/15 text-amber-400',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

export function Timeline({ events, loading, onViewReport }: TimelineProps) {
  if (loading) {
    return <p className="py-6 text-center text-xs text-neutral-500">A carregar timeline...</p>
  }

  if (events.length === 0) {
    return <p className="py-6 text-center text-xs text-neutral-500">Sem eventos registados.</p>
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${SOURCE_COLORS[event.source] ?? SOURCE_COLORS.manual}`}>
                {EVENT_LABELS[event.event_type] ?? event.event_type}
              </span>
              <span className="text-xs font-medium text-neutral-200">{event.title}</span>
            </div>
            <span className="shrink-0 text-[11px] text-neutral-600">{formatDate(event.created_at)}</span>
          </div>
          {event.event_type === 'stage_changed' && event.stage_from && event.stage_to && (
            <p className="text-xs text-neutral-400">
              {stageLabel(event.stage_from as LeadStage)} → {stageLabel(event.stage_to as LeadStage)}
            </p>
          )}
          {event.body && <p className="mt-1 text-xs text-neutral-400 whitespace-pre-wrap">{event.body}</p>}
          {onViewReport && !!(event.metadata as { report?: unknown } | null)?.report && (
            <button
              onClick={() => onViewReport(event)}
              className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              Ver relatório
            </button>
          )}
        </li>
      ))}
    </ol>
  )
}
