import type { LeadStage } from '@/lib/types'

export interface StageInfo {
  id: LeadStage
  label: string
  accent: string
}

export const STAGES: StageInfo[] = [
  { id: 'report', label: 'Relatório', accent: 'text-sky-400 border-sky-500/30' },
  { id: 'demo', label: 'Demo', accent: 'text-violet-400 border-violet-500/30' },
  { id: 'touch', label: 'First Touch', accent: 'text-amber-400 border-amber-500/30' },
  { id: 'negotiation', label: 'Negociação', accent: 'text-orange-400 border-orange-500/30' },
  { id: 'closed', label: 'Fechado', accent: 'text-emerald-400 border-emerald-500/30' },
  { id: 'discarded', label: 'Descartado', accent: 'text-neutral-500 border-neutral-600/40' },
]

export function stageLabel(stage: LeadStage): string {
  return STAGES.find((s) => s.id === stage)?.label ?? stage
}
