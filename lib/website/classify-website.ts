export type WebsitePresence = 'none' | 'social' | 'website'

// Hosts que não contam como site próprio: redes sociais, agregadores de links,
// mensageiros e encurtadores. Um negócio cujo websiteUri aponta para isto
// continua a ser prospect de website.
const SOCIAL_HOSTS = [
  // redes sociais
  'facebook.com',
  'fb.com',
  'fb.me',
  'm.me',
  'instagram.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'youtu.be',
  'linkedin.com',
  'pinterest.com',
  // mensageiros
  'wa.me',
  'whatsapp.com',
  't.me',
  // agregadores de links
  'linktr.ee',
  'linktree.com',
  'beacons.ai',
  'taplink.cc',
  'bio.link',
  'allmylinks.com',
  'campsite.bio',
  // páginas geradas / perfis
  'sites.google.com',
  'business.site',
  'negocio.site',
  'g.page',
  // encurtadores (um site próprio não vive atrás de um encurtador)
  'bit.ly',
  'tinyurl.com',
  'goo.gl',
  'cutt.ly',
]

export function classifyWebsite(url: string | null | undefined): WebsitePresence {
  if (!url) return 'none'

  let host: string
  try {
    const parsed = new URL(url)
    // Só http(s) com host conta como site — descarta javascript:, mailto:, etc.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'none'
    host = parsed.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return 'none'
  }

  if (!host) return 'none'

  const isSocial = SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
  return isSocial ? 'social' : 'website'
}
