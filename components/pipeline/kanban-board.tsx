'use client'

import { useState } from 'react'
import type { Lead, LeadStage } from '@/lib/types'
import { STAGES } from '@/lib/stages'

interface KanbanBoardProps {
  leads: Lead[]
  onSelect: (lead: Lead) => void
  onMoveStage: (leadId: string, stage: LeadStage, reason?: string) => void
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-emerald-500/15 text-emerald-400' :
    score >= 40 ? 'bg-amber-500/15 text-amber-400' :
    'bg-red-500/15 text-red-400'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
      {score}
    </span>
  )
}

export function KanbanBoard({ leads, onSelect, onMoveStage }: KanbanBoardProps) {
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null)

  const handleDrop = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault()
    setDragOverStage(null)

    const leadId = e.dataTransfer.getData('text/lead-id')
    const fromStage = e.dataTransfer.getData('text/lead-stage')
    if (!leadId || fromStage === stage) return

    if (stage === 'discarded') {
      const reason = window.prompt('Motivo para descartar este lead:')
      if (!reason?.trim()) return
      onMoveStage(leadId, stage, reason.trim())
      return
    }

    onMoveStage(leadId, stage)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage.id)
        return (
          <div
            key={stage.id}
            className="w-64 shrink-0"
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverStage(stage.id)
            }}
            onDragLeave={() => setDragOverStage((prev) => (prev === stage.id ? null : prev))}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className={`flex items-center justify-between rounded-t-lg border-b px-3 py-2 ${stage.accent}`}>
              <span className="text-xs font-semibold uppercase tracking-wide">{stage.label}</span>
              <span className="text-xs text-neutral-500">{stageLeads.length}</span>
            </div>

            <div
              className={`space-y-2 pt-2 min-h-24 rounded-b-lg transition-colors ${
                dragOverStage === stage.id ? 'bg-neutral-800/40' : ''
              }`}
            >
              {stageLeads.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-neutral-700">Sem leads</p>
              )}
              {stageLeads.map((lead) => (
                <button
                  key={lead.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/lead-id', lead.id)
                    e.dataTransfer.setData('text/lead-stage', lead.stage)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onClick={() => onSelect(lead)}
                  className="w-full cursor-grab active:cursor-grabbing rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-left hover:border-neutral-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-neutral-100 leading-snug">{lead.name}</span>
                    <ScoreBadge score={lead.opp_score} />
                  </div>
                  <p className="text-xs text-neutral-500 truncate">{lead.type}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {lead.website_presence === 'none' && (
                      <span className="text-[11px] text-rose-400">Sem website</span>
                    )}
                    {lead.website_presence === 'social' && (
                      <span className="text-[11px] text-amber-400">Só rede social</span>
                    )}
                    {lead.rating !== null && (
                      <span className="text-[11px] text-neutral-500">★ {lead.rating.toFixed(1)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
