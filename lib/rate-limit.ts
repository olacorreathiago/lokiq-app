import { NextResponse } from 'next/server'

// Rate limiter simples em memória (janela deslizante por chave IP+rota).
// Suficiente para o MVP pessoal single-instance — protege a chave Google/Anthropic
// de loops acidentais. Numa implantação serverless multi-instância isto é
// best-effort; migrar para Upstash/Redis quando houver tráfego real.

interface Bucket {
  timestamps: number[]
}

const buckets = new Map<string, Bucket>()

// Limpeza periódica para não crescer indefinidamente
let lastSweep = Date.now()
const SWEEP_INTERVAL_MS = 60_000

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs)
    if (bucket.timestamps.length === 0) buckets.delete(key)
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

interface RateLimitOptions {
  /** Nome da rota — compõe a chave para limites independentes por endpoint */
  key: string
  /** Máximo de pedidos permitidos na janela */
  limit: number
  /** Duração da janela em milissegundos */
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

export function checkRateLimit(request: Request, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  sweep(now, opts.windowMs)

  const bucketKey = `${opts.key}:${clientIp(request)}`
  const bucket = buckets.get(bucketKey) ?? { timestamps: [] }

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < opts.windowMs)

  if (bucket.timestamps.length >= opts.limit) {
    const oldest = bucket.timestamps[0]!
    const retryAfterSeconds = Math.ceil((opts.windowMs - (now - oldest)) / 1000)
    buckets.set(bucketKey, bucket)
    return { ok: false, remaining: 0, retryAfterSeconds }
  }

  bucket.timestamps.push(now)
  buckets.set(bucketKey, bucket)
  return { ok: true, remaining: opts.limit - bucket.timestamps.length, retryAfterSeconds: 0 }
}

/**
 * Aplica rate limiting e devolve uma resposta 429 se excedido, ou null se permitido.
 * Uso: `const limited = rateLimit(request, {...}); if (limited) return limited`
 */
export function rateLimit(request: Request, opts: RateLimitOptions): NextResponse | null {
  const result = checkRateLimit(request, opts)
  if (result.ok) return null

  return NextResponse.json(
    { error: 'Too many requests', retryAfter: result.retryAfterSeconds },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } },
  )
}
