'use client'

import { useCallback, useEffect, useState } from 'react'

interface BlockedPlace {
  id: string
  place_id: string
  name: string
  reason: string | null
  created_at: string
}

type Status = 'loading' | 'done' | 'error'

export default function BlockedPage() {
  const [blocks, setBlocks] = useState<BlockedPlace[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    fetch('/api/blocks')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erro ao carregar bloqueados')
        if (!active) return
        setBlocks(data.blocks ?? [])
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
  }, [])

  const unblock = useCallback(async (id: string) => {
    setRemovingId(id)
    try {
      const res = await fetch(`/api/blocks/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.id !== id))
      }
    } finally {
      setRemovingId(null)
    }
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Bloqueados</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Estes negócios não aparecem nas pesquisas. Desbloquear volta a incluí-los.
        </p>
      </header>

      {status === 'loading' && (
        <p className="py-12 text-center text-sm text-neutral-500">A carregar...</p>
      )}

      {status === 'error' && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}

      {status === 'done' && blocks.length === 0 && (
        <p className="py-12 text-center text-sm text-neutral-500">
          Não tens negócios bloqueados.
        </p>
      )}

      <ul className="space-y-2">
        {blocks.map((block) => (
          <li
            key={block.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-100 truncate">{block.name}</p>
              <p className="text-xs text-neutral-600">
                Bloqueado a {new Date(block.created_at).toLocaleDateString('pt-PT')}
                {block.reason && ` · ${block.reason}`}
              </p>
            </div>
            <button
              onClick={() => unblock(block.id)}
              disabled={removingId === block.id}
              className="shrink-0 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {removingId === block.id ? 'A remover...' : 'Desbloquear'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
