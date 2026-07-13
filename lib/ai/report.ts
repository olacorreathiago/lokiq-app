import { generate } from '@/lib/ai/client'
import { inspectWebsite } from '@/lib/website/inspect-website'
import type { WebsitePresence } from '@/lib/website/classify-website'

export interface ReportInput {
  name: string
  type: string
  address: string
  phone: string | null
  rating: number | null
  reviewCount: number | null
  hasWebsite: boolean
  websitePresence?: WebsitePresence
  websiteUrl?: string | null
  hasHours: boolean
  oppScore: number
  nearbyCompetitors: number
  noWebsiteRateInArea: number
}

const SYSTEM_PROMPT = `Tu és o Lokiq, um analista de oportunidades de mercado digital especializado em PMEs portuguesas sem presença online.

## O teu papel
Recebes dados de uma empresa local recolhidos do Google Maps e geras um relatório conciso de oportunidade. O objectivo é ajudar um vendedor de serviços digitais (websites, landing pages, lojas online) a avaliar rapidamente se vale a pena contactar esta empresa.

## Regras de análise

### Sinais positivos (oportunidade alta)
- Sem website detectado → principal indicador de oportunidade
- Só rede social (Facebook/Instagram como única presença) → oportunidade forte: o negócio já investe em presença digital mas não tem site próprio; pitch deve reconhecer o esforço existente e propor o upgrade
- Site existente mas inacessível/quebrado (erro, timeout) → oportunidade forte: presença digital abandonada
- Site em construtor básico (Wix, GoDaddy, Jimdo) → potencial upgrade para site profissional; mencionar apenas se relevante para o pitch
- Muitas reviews e rating alto → negócio activo e bem avaliado, tem clientes
- Telefone disponível → facilita contacto directo
- Horário preenchido → negócio organizado, investe no perfil GMB
- Muitos concorrentes na zona sem website → nicho com oportunidade sistémica
- Tipo de negócio com alta necessidade digital (beleza, saúde, restauração)

### Sinais negativos (oportunidade baixa)
- Poucas reviews ou rating baixo → negócio pode estar em dificuldades
- Sem telefone → difícil de contactar
- Zona com todos os concorrentes com website → mercado já saturado digitalmente

### Regras de pitch
- Nunca mencionar que a empresa "não tem website" como fraqueza — enquadrar como "oportunidade de crescimento digital"
- Pitch deve ser prático e directo — máximo 2 frases
- Adaptar linguagem ao tipo de negócio (beleza → "atrair novas clientes", restauração → "reservas online", técnico → "pedidos de orçamento")
- Mencionar benefício concreto: "os seus X concorrentes na zona já têm website" ou "Y% dos negócios do seu tipo na zona ainda não têm presença online"

## Formato de output

Responde SEMPRE em JSON válido com esta estrutura exacta:

{
  "resumo": "Frase curta (max 20 palavras) sobre a oportunidade",
  "sinais": [
    { "tipo": "positivo" | "negativo" | "neutro", "texto": "Descrição do sinal" }
  ],
  "contexto_mercado": "1-2 frases sobre a posição no mercado local",
  "pitch_sugerido": "Frase de abertura para usar no primeiro contacto",
  "proximos_passos": ["Passo 1", "Passo 2", "Passo 3"],
  "confianca": "alta" | "media" | "baixa"
}

Máximo 5 sinais. Máximo 3 próximos passos. Responde APENAS com JSON, sem markdown, sem explicações.`

export async function generateOpportunityReport(d: ReportInput) {
  // Fingerprint do site (só quando é site próprio): tecnologia + acessibilidade
  let websiteInfo = ''
  if ((d.websitePresence === 'website' || (d.websitePresence === undefined && d.hasWebsite)) && d.websiteUrl) {
    const inspection = await inspectWebsite(d.websiteUrl)
    websiteInfo = inspection.reachable
      ? `\nEstado do site: acessível${inspection.tech ? ` — tecnologia: ${inspection.tech}` : ''}`
      : `\nEstado do site: INACESSÍVEL (${inspection.error ?? 'erro desconhecido'})`
  }

  const userMessage = `Analisa esta empresa e gera o relatório de oportunidade:

Nome: ${d.name}
Tipo: ${d.type}
Morada: ${d.address || 'Não disponível'}
Telefone: ${d.phone || 'Não disponível'}
Rating: ${d.rating !== null ? `${d.rating}/5` : 'Sem rating'}
Reviews: ${d.reviewCount !== null ? d.reviewCount : 'Sem reviews'}
Presença digital: ${
    d.websitePresence === 'social'
      ? `Só rede social (${d.websiteUrl ?? 'link desconhecido'}) — sem site próprio`
      : d.websitePresence === 'website' || d.hasWebsite
        ? `Site próprio${d.websiteUrl ? ` (${d.websiteUrl})` : ''}`
        : 'Nenhuma — sem website nem redes sociais'
  }${websiteInfo}
Horário preenchido: ${d.hasHours ? 'Sim' : 'Não'}
Score de oportunidade: ${d.oppScore}/100
Concorrentes na zona (1km, mesmo tipo): ${d.nearbyCompetitors}
Taxa sem website na zona: ${d.noWebsiteRateInArea}%`

  const { text, usage } = await generate({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
  })

  return { report: parseReportJson(text), usage }
}

// O modelo por vezes envolve o JSON em fences markdown ou texto — extrair o objecto
function parseReportJson(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        // cai para o throw abaixo
      }
    }
    throw new Error(`AI returned invalid JSON: ${trimmed.slice(0, 120)}`)
  }
}
