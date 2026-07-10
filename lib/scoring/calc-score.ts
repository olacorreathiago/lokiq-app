interface ScoreInput {
  noWebsiteRateInArea: number
  reviewCount: number
  rating: number
  hasPhone: boolean
  hasHours: boolean
}

export function calcScore(input: ScoreInput): number {
  const score =
    input.noWebsiteRateInArea * 30 +
    (Math.min(input.reviewCount, 200) / 200) * 25 +
    (input.rating / 5) * 20 +
    (input.hasPhone ? 1 : 0) * 15 +
    (input.hasHours ? 1 : 0) * 10

  return Math.round(Math.max(0, Math.min(100, score)))
}
