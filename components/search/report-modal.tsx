'use client'

interface ReportData {
  resumo: string
  sinais: { tipo: string; texto: string }[]
  contexto_mercado: string
  pitch_sugerido: string
  proximos_passos: string[]
  confianca: string
}

interface ReportModalProps {
  report: ReportData | null
  businessName: string
  loading: boolean
  error?: string | null
  onClose: () => void
}

export function ReportModal({ report, businessName, loading, error, onClose }: ReportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-100">
            {loading ? 'A gerar relatorio...' : businessName}
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 text-xl leading-none">&times;</button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-emerald-500" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3">
            <p className="text-sm font-medium text-rose-400 mb-1">Erro ao gerar relatório</p>
            <p className="text-xs text-rose-400/80">{error}</p>
          </div>
        )}

        {report && !loading && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-300 font-medium">{report.resumo}</p>

            <div>
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Sinais</h3>
              <div className="space-y-1.5">
                {report.sinais.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={
                      s.tipo === 'positivo' ? 'text-emerald-400' :
                      s.tipo === 'negativo' ? 'text-rose-400' : 'text-neutral-400'
                    }>
                      {s.tipo === 'positivo' ? '+' : s.tipo === 'negativo' ? '-' : '~'}
                    </span>
                    <span className="text-neutral-300">{s.texto}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Contexto de Mercado</h3>
              <p className="text-sm text-neutral-400">{report.contexto_mercado}</p>
            </div>

            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
              <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1">Pitch Sugerido</h3>
              <p className="text-sm text-neutral-200">{report.pitch_sugerido}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Proximos Passos</h3>
              <ol className="list-decimal list-inside space-y-1">
                {report.proximos_passos.map((p, i) => (
                  <li key={i} className="text-sm text-neutral-400">{p}</li>
                ))}
              </ol>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <span className="text-xs text-neutral-500">
                Confianca: <span className={
                  report.confianca === 'alta' ? 'text-emerald-400' :
                  report.confianca === 'media' ? 'text-amber-400' : 'text-rose-400'
                }>{report.confianca}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
