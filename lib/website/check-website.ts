import { resolve } from 'dns/promises'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface WebsiteCheckResult {
  hasWebsite: boolean
  source?: 'dns'
  domain?: string
  checked: string[]
}

export async function checkWebsite(name: string): Promise<WebsiteCheckResult> {
  const slug = slugify(name)
  const compact = slug.replace(/-/g, '')

  const domains = [
    `${slug}.pt`,
    `${slug}.com`,
    `${compact}.pt`,
    `${compact}.com`,
  ]

  for (const domain of domains) {
    try {
      await resolve(domain)
      const res = await fetch(`https://${domain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(2000),
      })
      if (res.ok) {
        return { hasWebsite: true, source: 'dns', domain, checked: domains }
      }
    } catch {
      // domain doesn't resolve or times out — continue
    }
  }

  return { hasWebsite: false, checked: domains }
}
