'use client'

import type { SearchResult } from '@/lib/search-result'

interface LeadCardProps {
  result: SearchResult
  onSave: (result: SearchResult) => void
  onReport: (result: SearchResult) => void
  onBlock?: (result: SearchResult) => void
  saving?: boolean
  saved?: boolean
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
    score >= 40 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
    'bg-red-500/15 text-red-400 border-red-500/30'

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      {score}
    </span>
  )
}

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-xs text-neutral-500">Sem rating</span>
  return (
    <span className="text-xs text-amber-400">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
      <span className="ml-1 text-neutral-400">{rating.toFixed(1)}</span>
    </span>
  )
}

export function LeadCard({ result, onSave, onReport, onBlock, saving, saved }: LeadCardProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 hover:border-neutral-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-neutral-100 truncate">{result.name}</h3>
            <ScoreBadge score={result.oppScore} />
          </div>
          <p className="text-xs text-neutral-400 mb-2">{result.type}</p>
          <p className="text-xs text-neutral-500 truncate">{result.address}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Stars rating={result.rating} />
        {result.reviewCount !== null && (
          <span className="text-xs text-neutral-500">{result.reviewCount} reviews</span>
        )}
        {result.phone && (
          <a href={`tel:${result.phone}`} className="text-xs text-blue-400 hover:text-blue-300">
            {result.phone}
          </a>
        )}
        {result.websitePresence === 'none' && (
          <span className="text-xs text-rose-400 font-medium">Sem website</span>
        )}
        {result.websitePresence === 'social' && (
          result.websiteUrl ? (
            <a
              href={result.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-400 font-medium hover:text-amber-300"
            >
              Só rede social
            </a>
          ) : (
            <span className="text-xs text-amber-400 font-medium">Só rede social</span>
          )
        )}
        {result.websitePresence === 'website' && (
          result.websiteUrl ? (
            <a
              href={result.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 font-medium hover:text-emerald-300"
            >
              Tem website
            </a>
          ) : (
            <span className="text-xs text-emerald-400 font-medium">Tem website</span>
          )
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onSave(result)}
          disabled={saving || saved}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            saved
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50'
          }`}
        >
          {saved ? 'Guardado ✓' : saving ? 'A guardar...' : 'Guardar Lead'}
        </button>
        <button
          onClick={() => onReport(result)}
          className="flex-1 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
        >
          Gerar Relatorio
        </button>
        {result.gmapsUri && (
          <a
            href={result.gmapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-800 transition-colors"
          >
            Maps
          </a>
        )}
        {onBlock && (
          <button
            onClick={() => onBlock(result)}
            title="Bloquear — não voltar a mostrar este resultado"
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
