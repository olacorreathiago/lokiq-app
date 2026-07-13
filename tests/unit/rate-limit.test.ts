import { describe, it, expect } from 'vitest'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'

function req(ip: string): Request {
  return new Request('http://localhost/api/x', {
    headers: { 'x-forwarded-for': ip },
  })
}

describe('clientIp', () => {
  it('extrai o primeiro IP de x-forwarded-for', () => {
    expect(clientIp(req('1.2.3.4, 5.6.7.8'))).toBe('1.2.3.4')
  })

  it('devolve "unknown" sem cabeçalhos de IP', () => {
    expect(clientIp(new Request('http://localhost/'))).toBe('unknown')
  })
})

describe('checkRateLimit', () => {
  it('permite até ao limite e bloqueia a seguir', () => {
    const opts = { key: 'test-a', limit: 3, windowMs: 60_000 }
    const r = req('10.0.0.1')

    expect(checkRateLimit(r, opts).ok).toBe(true)
    expect(checkRateLimit(r, opts).ok).toBe(true)
    const third = checkRateLimit(r, opts)
    expect(third.ok).toBe(true)
    expect(third.remaining).toBe(0)

    const blocked = checkRateLimit(r, opts)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('isola limites por IP', () => {
    const opts = { key: 'test-b', limit: 1, windowMs: 60_000 }
    expect(checkRateLimit(req('10.0.0.2'), opts).ok).toBe(true)
    expect(checkRateLimit(req('10.0.0.2'), opts).ok).toBe(false)
    // IP diferente tem o seu próprio bucket
    expect(checkRateLimit(req('10.0.0.3'), opts).ok).toBe(true)
  })

  it('isola limites por rota', () => {
    const r = req('10.0.0.4')
    expect(checkRateLimit(r, { key: 'route-x', limit: 1, windowMs: 60_000 }).ok).toBe(true)
    expect(checkRateLimit(r, { key: 'route-x', limit: 1, windowMs: 60_000 }).ok).toBe(false)
    // rota diferente, mesmo IP → bucket independente
    expect(checkRateLimit(r, { key: 'route-y', limit: 1, windowMs: 60_000 }).ok).toBe(true)
  })

  it('reabre a janela quando o tempo passa', async () => {
    const opts = { key: 'test-c', limit: 1, windowMs: 30 }
    const r = req('10.0.0.5')
    expect(checkRateLimit(r, opts).ok).toBe(true)
    expect(checkRateLimit(r, opts).ok).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(checkRateLimit(r, opts).ok).toBe(true)
  })
})
