'use client'

import { useCallback, useRef, useState } from 'react'
import { NICHES, nicheTypes } from '@/lib/niches'
import type { SearchResult } from '@/lib/search-result'
import { LeadCard } from '@/components/search/lead-card'
import { ReportModal } from '@/components/search/report-modal'

type Mode = 'raio' | 'pontual'
type Status = 'idle' | 'loading' | 'done' | 'error'

interface CostBreakdown {
  geocode: number
  nearbySearch: number
  placeDetails: number
  placeDetailsCount: number
  total: number
}

interface ReportState {
  data: Record<string, unknown> | null
  loading: boolean
  businessName: string
  error: string | null
}

export default function SearchPage() {
  const [mode, setMode] = useState<Mode>('raio')

  const [address, setAddress] = useState('')
  const [radius, setRadius] = useState(2000)
  const [niche, setNiche] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [maxResults, setMaxResults] = useState(10)
  const [onlyWithoutWebsite, setOnlyWithoutWebsite] = useState(true)

  const changeNiche = useCallback((id: string) => {
    setNiche(id)
    const n = NICHES.find((x) => x.id === id)
    setSelectedTypes(new Set(n ? nicheTypes(n) : []))
  }, [])

  const toggleType = useCallback((type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const [pontualQuery, setPontualQuery] = useState('')

  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [meta, setMeta] = useState<{
    total: number
    filtered: number
    withoutWebsite: number
    onlyWithoutWebsite: boolean
    blockedExcluded: number
    alreadySavedExcluded: number
  } | null>(null)
  const [cost, setCost] = useState<CostBreakdown | null>(null)

  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const savedLeadIds = useRef<Map<string, string>>(new Map())
  const [report, setReport] = useState<ReportState>({ data: null, loading: false, businessName: '', error: null })
  const [saveError, setSaveError] = useState('')

  const geocode = useCallback(async (addr: string): Promise<{ lat: number; lng: number }> => {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(addr)}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Morada nao encontrada')
    return { lat: data.lat, lng: data.lng }
  }, [])

  const getGPS = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS nao disponivel'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error('Permissao GPS negada')),
        { enableHighAccuracy: true, timeout: 10000 },
      )
    })
  }, [])

  const searchNearby = useCallback(async () => {
    setStatus('loading')
    setError('')
    setResults([])
    setMeta(null)
    setCost(null)

    try {
      const coords = await geocode(address)
      const selectedNiche = NICHES.find((n) => n.id === niche)

      const searchBody: Record<string, unknown> = {
        lat: coords.lat,
        lng: coords.lng,
        radiusMeters: radius,
        maxResults,
        onlyWithoutWebsite,
      }
      if (selectedNiche) {
        const types = selectedTypes.size > 0 ? [...selectedTypes] : nicheTypes(selectedNiche)
        searchBody.includedTypes = types
      }

      const res = await fetch('/api/search/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro na pesquisa')

      setResults(data.results ?? [])
      setMeta({
        total: data.total ?? 0,
        filtered: data.filtered ?? 0,
        withoutWebsite: data.withoutWebsite ?? 0,
        onlyWithoutWebsite,
        blockedExcluded: data.blockedExcluded ?? 0,
        alreadySavedExcluded: data.alreadySavedExcluded ?? 0,
      })
      setCost(data.cost ?? null)
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setStatus('error')
    }
  }, [address, radius, niche, selectedTypes, maxResults, onlyWithoutWebsite, geocode])

  const searchText = useCallback(async () => {
    setStatus('loading')
    setError('')
    setResults([])
    setMeta(null)
    setCost(null)

    try {
      const coords = await getGPS()

      const res = await fetch('/api/search/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: pontualQuery,
          lat: coords.lat,
          lng: coords.lng,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro na pesquisa')

      setResults(data.results ?? [])
      setCost({ geocode: 0, nearbySearch: 0.032, placeDetails: 0.017, placeDetailsCount: 1, total: 0.08 })
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setStatus('error')
    }
  }, [pontualQuery, getGPS])

  const saveLead = useCallback(async (result: SearchResult) => {
    setSavingId(result.placeId)
    setSaveError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: result.placeId,
          name: result.name,
          type: result.type,
          address: result.address,
          phone: result.phone,
          rating: result.rating,
          review_count: result.reviewCount,
          has_website: result.hasWebsite,
          website_presence: result.websitePresence,
          website_url: result.websiteUrl,
          opp_score: result.oppScore,
          capture_mode: mode,
          lat: result.lat,
          lng: result.lng,
          gmaps_uri: result.gmapsUri,
          has_hours: result.hasHours,
          nearby_competitors: result.nearbyCompetitors ?? 0,
          no_website_rate: (result.noWebsiteRateInArea ?? 50) / 100,
        }),
      })

      if (res.ok || res.status === 409) {
        const data = await res.json().catch(() => ({}))
        const leadId: string | undefined = data.lead?.id ?? data.leadId
        if (leadId) {
          savedLeadIds.current.set(result.placeId, leadId)
        }
        setSavedIds((prev) => new Set(prev).add(result.placeId))
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(`Erro ao guardar "${result.name}": ${data.error ?? `HTTP ${res.status}`}`)
      }
    } catch (e) {
      setSaveError(`Erro ao guardar "${result.name}": ${e instanceof Error ? e.message : 'erro de rede'}`)
    } finally {
      setSavingId(null)
    }
  }, [mode])

  const blockResult = useCallback(async (result: SearchResult) => {
    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: result.placeId, name: result.name }),
      })
      if (res.ok || res.status === 409) {
        setResults((prev) => prev.filter((r) => r.placeId !== result.placeId))
      }
    } catch {
      // falha silenciosa: o resultado fica na lista
    }
  }, [])

  const generateReport = useCallback(async (result: SearchResult) => {
    setReport({ data: null, loading: true, businessName: result.name, error: null })
    try {
      // Lead já guardado → gera via pipeline (fica persistido na timeline)
      const savedLeadId = savedLeadIds.current.get(result.placeId)
      const res = savedLeadId
        ? await fetch(`/api/leads/${savedLeadId}/report`, { method: 'POST' })
        : await fetch('/api/ai/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: result.name,
              type: result.type,
              address: result.address,
              phone: result.phone,
              rating: result.rating,
              reviewCount: result.reviewCount,
              hasWebsite: result.hasWebsite,
              websitePresence: result.websitePresence,
              websiteUrl: result.websiteUrl,
              hasHours: result.hasHours,
              oppScore: result.oppScore,
              nearbyCompetitors: result.nearbyCompetitors ?? 0,
              noWebsiteRateInArea: result.noWebsiteRateInArea ?? 50,
            }),
          })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Erro ao gerar relatório')
      setReport({ data: data.report, loading: false, businessName: result.name, error: null })
    } catch (e) {
      setReport({
        data: null,
        loading: false,
        businessName: result.name,
        error: e instanceof Error ? e.message : 'Erro desconhecido',
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Lokiq Search</h1>
          <p className="text-sm text-neutral-500 mt-1">Encontra PMEs sem website na tua zona</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-neutral-800/50 p-1 mb-6">
          <button
            onClick={() => setMode('raio')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'raio' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Modo Raio
          </button>
          <button
            onClick={() => setMode('pontual')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'pontual' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Modo Pontual
          </button>
        </div>

        {/* Modo Raio Form */}
        {mode === 'raio' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Morada ou Localidade</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Rua Augusta, Lisboa"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Raio</label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                >
                  <option value={500}>500m</option>
                  <option value={1000}>1 km</option>
                  <option value={2000}>2 km</option>
                  <option value={5000}>5 km</option>
                  <option value={10000}>10 km</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Nicho</label>
                <select
                  value={niche}
                  onChange={(e) => changeNiche(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                >
                  <option value="">Todos</option>
                  {NICHES.map((n) => (
                    <option key={n.id} value={n.id}>{n.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Max resultados</label>
                <select
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            {niche && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Sub-tipos ({selectedTypes.size} seleccionados)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {NICHES.find((n) => n.id === niche)?.subtypes.map((s) => (
                    <button
                      key={s.type}
                      type="button"
                      onClick={() => toggleType(s.type)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        selectedTypes.has(s.type)
                          ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                          : 'border-neutral-700 bg-neutral-800/30 text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Filtro de website</label>
              <div className="flex gap-1 rounded-lg bg-neutral-800/50 p-1">
                <button
                  type="button"
                  onClick={() => setOnlyWithoutWebsite(true)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    onlyWithoutWebsite ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Sem site próprio
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyWithoutWebsite(false)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    !onlyWithoutWebsite ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Todos
                </button>
              </div>
            </div>

            <button
              onClick={searchNearby}
              disabled={status === 'loading' || !address.trim()}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {status === 'loading' ? 'A pesquisar...' : 'Pesquisar'}
            </button>
          </div>
        )}

        {/* Modo Pontual Form */}
        {mode === 'pontual' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Nome do Negocio</label>
              <input
                type="text"
                value={pontualQuery}
                onChange={(e) => setPontualQuery(e.target.value)}
                placeholder="Ex: Cabeleireiro Maria"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <p className="text-xs text-neutral-500">Usa a tua localizacao GPS para encontrar o negocio proximo</p>

            <button
              onClick={searchText}
              disabled={status === 'loading' || !pontualQuery.trim()}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {status === 'loading' ? 'A pesquisar...' : 'Pesquisar com GPS'}
            </button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 mb-6">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}

        {saveError && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 mb-4">
            <p className="text-sm text-rose-400">{saveError}</p>
            <button onClick={() => setSaveError('')} className="text-rose-400/60 hover:text-rose-300 text-sm leading-none">✕</button>
          </div>
        )}

        {/* Cost + Results Meta */}
        {status === 'done' && (meta || cost) && (
          <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3 mb-4">
            <div className="text-xs text-neutral-500">
              {meta && (
                <>
                  {meta.onlyWithoutWebsite
                    ? <>{results.length} leads sem site próprio de {meta.filtered} filtrados ({meta.total} total)</>
                    : <>{results.length} estabelecimentos ({meta.withoutWebsite} sem site próprio) de {meta.total} total</>}
                  {(meta.blockedExcluded > 0 || meta.alreadySavedExcluded > 0) && (
                    <span className="ml-1 text-neutral-600">
                      · excluídos: {meta.blockedExcluded > 0 && `${meta.blockedExcluded} bloqueados`}
                      {meta.blockedExcluded > 0 && meta.alreadySavedExcluded > 0 && ', '}
                      {meta.alreadySavedExcluded > 0 && `${meta.alreadySavedExcluded} já guardados`}
                    </span>
                  )}
                </>
              )}
            </div>
            {cost && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-600" title={`Geocode: ${cost.geocode.toFixed(3)}  |  Nearby: ${cost.nearbySearch.toFixed(3)}  |  Details: ${cost.placeDetailsCount}x ${(cost.placeDetails / Math.max(cost.placeDetailsCount, 1)).toFixed(3)} = ${cost.placeDetails.toFixed(3)}`}>
                  {cost.placeDetailsCount} Place Details
                </span>
                <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-mono font-semibold text-amber-400">
                  {cost.total.toFixed(3)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {status === 'done' && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-neutral-500">Nenhum resultado encontrado.</p>
            <p className="text-xs text-neutral-600 mt-1">Tenta alargar o raio ou mudar de nicho.</p>
          </div>
        )}

        <div className="space-y-3">
          {results.map((r) => (
            <LeadCard
              key={r.placeId}
              result={r}
              onSave={saveLead}
              onReport={generateReport}
              onBlock={blockResult}
              saving={savingId === r.placeId}
              saved={savedIds.has(r.placeId)}
            />
          ))}
        </div>

        {/* Report Modal */}
        {(report.loading || report.data || report.error) && (
          <ReportModal
            report={report.data as Parameters<typeof ReportModal>[0]['report']}
            businessName={report.businessName}
            loading={report.loading}
            error={report.error}
            onClose={() => setReport({ data: null, loading: false, businessName: '', error: null })}
          />
        )}
      </div>
    </div>
  )
}
