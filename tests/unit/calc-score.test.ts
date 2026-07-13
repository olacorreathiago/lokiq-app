import { describe, it, expect } from 'vitest'
import { calcScore } from '@/lib/scoring/calc-score'

describe('calcScore', () => {
  it('devolve 0 para o pior caso possível', () => {
    expect(
      calcScore({ noWebsiteRateInArea: 0, reviewCount: 0, rating: 0, hasPhone: false, hasHours: false }),
    ).toBe(0)
  })

  it('devolve 100 para o melhor caso possível', () => {
    expect(
      calcScore({ noWebsiteRateInArea: 1, reviewCount: 200, rating: 5, hasPhone: true, hasHours: true }),
    ).toBe(100)
  })

  it('pondera cada dimensão com o seu peso', () => {
    // só noWebsiteRate a 100% → 30
    expect(
      calcScore({ noWebsiteRateInArea: 1, reviewCount: 0, rating: 0, hasPhone: false, hasHours: false }),
    ).toBe(30)
    // só reviews no máximo → 25
    expect(
      calcScore({ noWebsiteRateInArea: 0, reviewCount: 200, rating: 0, hasPhone: false, hasHours: false }),
    ).toBe(25)
    // só rating máximo → 20
    expect(
      calcScore({ noWebsiteRateInArea: 0, reviewCount: 0, rating: 5, hasPhone: false, hasHours: false }),
    ).toBe(20)
    // só telefone → 15
    expect(
      calcScore({ noWebsiteRateInArea: 0, reviewCount: 0, rating: 0, hasPhone: true, hasHours: false }),
    ).toBe(15)
    // só horário → 10
    expect(
      calcScore({ noWebsiteRateInArea: 0, reviewCount: 0, rating: 0, hasPhone: false, hasHours: true }),
    ).toBe(10)
  })

  it('faz cap das reviews a 200 (mais reviews não sobem o score)', () => {
    const at200 = calcScore({ noWebsiteRateInArea: 0, reviewCount: 200, rating: 0, hasPhone: false, hasHours: false })
    const at500 = calcScore({ noWebsiteRateInArea: 0, reviewCount: 500, rating: 0, hasPhone: false, hasHours: false })
    expect(at200).toBe(25)
    expect(at500).toBe(25)
  })

  it('arredonda para inteiro', () => {
    // reviewCount 50 → 50/200*25 = 6.25 → 6
    const score = calcScore({ noWebsiteRateInArea: 0, reviewCount: 50, rating: 0, hasPhone: false, hasHours: false })
    expect(score).toBe(6)
    expect(Number.isInteger(score)).toBe(true)
  })

  it('nunca ultrapassa os limites 0–100 mesmo com inputs fora do intervalo', () => {
    expect(
      calcScore({ noWebsiteRateInArea: 5, reviewCount: 9999, rating: 10, hasPhone: true, hasHours: true }),
    ).toBe(100)
    expect(
      calcScore({ noWebsiteRateInArea: -5, reviewCount: -10, rating: -5, hasPhone: false, hasHours: false }),
    ).toBe(0)
  })

  it('combina dimensões — caso realista de barbearia sem site', () => {
    // noWebsite 50%, 100 reviews, rating 4.5, com telefone, sem horário
    // 0.5*30 + (100/200)*25 + (4.5/5)*20 + 15 + 0 = 15 + 12.5 + 18 + 15 = 60.5 → 61
    const score = calcScore({ noWebsiteRateInArea: 0.5, reviewCount: 100, rating: 4.5, hasPhone: true, hasHours: false })
    expect(score).toBe(61)
  })
})
