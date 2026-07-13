import { describe, it, expect } from 'vitest'
import { classifyWebsite } from '@/lib/website/classify-website'

describe('classifyWebsite', () => {
  it('classifica ausência de URL como "none"', () => {
    expect(classifyWebsite(null)).toBe('none')
    expect(classifyWebsite(undefined)).toBe('none')
    expect(classifyWebsite('')).toBe('none')
  })

  it('classifica URLs inválidos como "none"', () => {
    expect(classifyWebsite('not a url')).toBe('none')
    expect(classifyWebsite('javascript:alert(1)')).toBe('none')
  })

  it('classifica redes sociais como "social"', () => {
    expect(classifyWebsite('https://www.facebook.com/barbearia')).toBe('social')
    expect(classifyWebsite('https://instagram.com/spa.lisboa')).toBe('social')
    expect(classifyWebsite('https://m.me/negocio')).toBe('social')
    expect(classifyWebsite('https://www.tiktok.com/@loja')).toBe('social')
  })

  it('classifica mensageiros e agregadores como "social"', () => {
    expect(classifyWebsite('https://wa.me/351912345678')).toBe('social')
    expect(classifyWebsite('https://linktr.ee/negocio')).toBe('social')
    expect(classifyWebsite('https://taplink.cc/loja')).toBe('social')
  })

  it('classifica encurtadores e páginas geradas como "social"', () => {
    expect(classifyWebsite('https://bit.ly/abc')).toBe('social')
    expect(classifyWebsite('https://sites.google.com/view/loja')).toBe('social')
    expect(classifyWebsite('https://negocio.business.site')).toBe('social')
  })

  it('classifica domínios próprios como "website"', () => {
    expect(classifyWebsite('https://www.barbeariapassos.pt')).toBe('website')
    expect(classifyWebsite('https://restaurante-exemplo.com')).toBe('website')
    expect(classifyWebsite('http://clinica.pt/agendar')).toBe('website')
  })

  it('trata o prefixo www e subdomínios de redes sociais', () => {
    expect(classifyWebsite('https://www.facebook.com')).toBe('social')
    expect(classifyWebsite('https://pt-pt.facebook.com/pagina')).toBe('social')
  })

  it('não confunde domínio próprio que contém nome de rede social', () => {
    // facebookmarketing.pt NÃO é facebook.com
    expect(classifyWebsite('https://facebookmarketing.pt')).toBe('website')
    expect(classifyWebsite('https://meu-instagram-shop.com')).toBe('website')
  })
})
