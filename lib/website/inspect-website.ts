export interface WebsiteInspection {
  reachable: boolean
  status: number | null
  tech: string | null
  signals: string[]
  error: string | null
}

const FETCH_TIMEOUT_MS = 6000
const MAX_HTML_BYTES = 100_000

interface TechDetector {
  tech: string
  test: (html: string, headers: Headers) => boolean
}

// Ordem importa: detecções específicas (WooCommerce) antes das genéricas (WordPress)
const DETECTORS: TechDetector[] = [
  {
    tech: 'WordPress (WooCommerce)',
    test: (html) => html.includes('woocommerce') && (html.includes('/wp-content/') || html.includes('/wp-includes/')),
  },
  {
    tech: 'WordPress',
    test: (html) =>
      html.includes('/wp-content/') ||
      html.includes('/wp-includes/') ||
      /<meta[^>]+generator[^>]+wordpress/i.test(html),
  },
  {
    tech: 'Wix',
    test: (html, headers) =>
      html.includes('wixstatic.com') ||
      html.includes('wix.com') ||
      [...headers.keys()].some((k) => k.startsWith('x-wix')),
  },
  {
    tech: 'Squarespace',
    test: (html, headers) =>
      html.includes('squarespace.com') || (headers.get('server') ?? '').toLowerCase().includes('squarespace'),
  },
  {
    tech: 'Shopify',
    test: (html, headers) => html.includes('cdn.shopify.com') || headers.has('x-shopid') || headers.has('x-shopify-stage'),
  },
  {
    tech: 'Webflow',
    test: (html) => html.includes('assets.website-files.com') || /<meta[^>]+generator[^>]+webflow/i.test(html),
  },
  {
    tech: 'GoDaddy Website Builder',
    test: (html) => html.includes('wsimg.com') || /<meta[^>]+generator[^>]+godaddy/i.test(html),
  },
  { tech: 'Jimdo', test: (html) => html.includes('jimdo') },
  { tech: 'Joomla', test: (html) => /<meta[^>]+generator[^>]+joomla/i.test(html) },
  {
    tech: 'Drupal',
    test: (html, headers) => (headers.get('x-generator') ?? '').includes('Drupal') || html.includes('/sites/default/files/'),
  },
  { tech: 'PrestaShop', test: (html) => html.includes('prestashop') },
  { tech: 'Odoo', test: (html) => html.includes('/web/assets/') && html.includes('odoo') },
  { tech: 'Next.js', test: (html) => html.includes('__next') || html.includes('/_next/') },
  { tech: 'Nuxt', test: (html) => html.includes('__nuxt') || html.includes('/_nuxt/') },
]

export function detectTech(html: string, headers: Headers): { tech: string | null; signals: string[] } {
  const lower = html.toLowerCase()

  for (const detector of DETECTORS) {
    if (detector.test(lower, headers)) {
      return { tech: detector.tech, signals: [detector.tech] }
    }
  }

  const generator = /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i.exec(html)
  if (generator?.[1]) {
    return { tech: generator[1], signals: [`meta generator: ${generator[1]}`] }
  }

  return { tech: null, signals: [] }
}

export async function inspectWebsite(url: string): Promise<WebsiteInspection> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!res.ok) {
      return {
        reachable: false,
        status: res.status,
        tech: null,
        signals: [],
        error: `HTTP ${res.status}`,
      }
    }

    const reader = res.body?.getReader()
    let html = ''
    if (reader) {
      const decoder = new TextDecoder()
      let bytes = 0
      while (bytes < MAX_HTML_BYTES) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        html += decoder.decode(value, { stream: true })
      }
      await reader.cancel().catch(() => {})
    }

    const { tech, signals } = detectTech(html, res.headers)
    return { reachable: true, status: res.status, tech, signals, error: null }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const error = message.includes('timeout') || message.includes('abort')
      ? 'timeout'
      : message
    return { reachable: false, status: null, tech: null, signals: [], error }
  }
}
