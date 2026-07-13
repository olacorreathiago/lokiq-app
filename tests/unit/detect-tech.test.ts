import { describe, it, expect } from 'vitest'
import { detectTech } from '@/lib/website/inspect-website'

// detectTech recebe html já em minúsculas (como o inspectWebsite faz),
// por isso passamos as fixtures em minúsculas.
function h(init?: Record<string, string>): Headers {
  return new Headers(init)
}

describe('detectTech', () => {
  it('detecta WordPress por wp-content', () => {
    expect(detectTech('<link href="/wp-content/themes/x.css">', h()).tech).toBe('WordPress')
  })

  it('detecta WooCommerce antes de WordPress genérico', () => {
    const html = '<div class="woocommerce"><link href="/wp-content/x.css"></div>'
    expect(detectTech(html, h()).tech).toBe('WordPress (WooCommerce)')
  })

  it('detecta Wix por domínio estático', () => {
    expect(detectTech('<img src="https://static.wixstatic.com/a.png">', h()).tech).toBe('Wix')
  })

  it('detecta Wix por header x-wix', () => {
    expect(detectTech('<html></html>', h({ 'x-wix-request-id': 'abc' })).tech).toBe('Wix')
  })

  it('detecta Shopify por header', () => {
    expect(detectTech('<html></html>', h({ 'x-shopid': '123' })).tech).toBe('Shopify')
  })

  it('detecta Squarespace', () => {
    expect(detectTech('<meta content="squarespace.com">', h()).tech).toBe('Squarespace')
  })

  it('detecta via meta generator quando nenhum detector específico bate', () => {
    const html = '<meta name="generator" content="Ghost 5.0">'
    const result = detectTech(html, h())
    expect(result.tech).toBe('Ghost 5.0')
    expect(result.signals[0]).toContain('meta generator')
  })

  it('devolve tech null para site sem sinais reconhecíveis', () => {
    const result = detectTech('<html><body>olá</body></html>', h())
    expect(result.tech).toBeNull()
    expect(result.signals).toEqual([])
  })
})
