import { describe, it, expect } from 'vitest'
import { parseReportJson } from '@/lib/ai/report'

describe('parseReportJson', () => {
  it('faz parse de JSON limpo', () => {
    const out = parseReportJson('{"resumo":"ok","confianca":"alta"}')
    expect(out).toEqual({ resumo: 'ok', confianca: 'alta' })
  })

  it('faz parse de JSON com espaços à volta', () => {
    expect(parseReportJson('  \n {"a":1} \n ')).toEqual({ a: 1 })
  })

  it('extrai JSON envolto em fences markdown', () => {
    const text = '```json\n{"resumo":"teste","sinais":[]}\n```'
    expect(parseReportJson(text)).toEqual({ resumo: 'teste', sinais: [] })
  })

  it('extrai JSON precedido de texto explicativo', () => {
    const text = 'Aqui está o relatório:\n{"pitch_sugerido":"Olá"}'
    expect(parseReportJson(text)).toEqual({ pitch_sugerido: 'Olá' })
  })

  it('lida com objecto aninhado dentro de fences', () => {
    const text = '```\n{"a":{"b":[1,2]},"c":"x"}\n```'
    expect(parseReportJson(text)).toEqual({ a: { b: [1, 2] }, c: 'x' })
  })

  it('lança erro quando não há JSON extraível', () => {
    expect(() => parseReportJson('sem qualquer json aqui')).toThrow(/invalid JSON/)
  })

  it('lança erro para objecto malformado sem fecho válido', () => {
    expect(() => parseReportJson('{"a": ')).toThrow(/invalid JSON/)
  })
})
