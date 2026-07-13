# Lokiq — Roadmap Fase 1
> Prospecting Engine pessoal: pesquisa geolocalizada de empresas sem website + relatório IA + pipeline de vendas

---

## Visão geral

**Produto:** Ferramenta pessoal para identificar PMEs sem presença digital, gerar relatório de oportunidade com IA e gerir pipeline de vendas até ao fecho.

**Dois modos de captura:**
- **Modo Raio** — pesquisa em massa por nicho + região (Nearby Search)
- **Modo Pontual** — pesquisa instantânea por nome no terreno (Text Search + GPS)

**Pipeline de lead:** `Relatório Gerado → Demo Gerada → First Touch → Negociação → Fechado / Sem Interesse`

**Stack:** Next.js 15 · Supabase · Google Places API (New) · Claude Haiku 4.5 · Vercel

---

## Stack técnica

| Camada | Tecnologia | Justificação |
|---|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind CSS | SSR, mobile-first, deploy Vercel |
| Backend | Next.js API Routes | Monorepo simples para MVP |
| Base de dados | Supabase (Postgres + Auth + Storage) | Auth, DB e storage num só serviço |
| Geolocalização | Google Places API (New) | Nearby Search + Text Search + Place Details |
| IA — relatórios | Claude Haiku 4.5 via API | $1/$5 por MTok, prompt caching |
| IA — landing pages | Claude Haiku 4.5 via API | Geração de HTML estático |
| Deploy landing pages | Vercel + GitHub API | Push automático para subdomínio |
| Deploy app | Vercel (Free → Pro) | CI/CD automático |
| Pagamentos (futuro F2) | Stripe | Preparar estrutura desde MVP |
| Detecção website | `websiteUri` via Place Details (Enterprise SKU) | Fiável, incluído no FieldMask |

---

## Modelo de dados — Supabase

### Tabela `leads`
```
id               uuid PK
place_id         text          -- Google Places ID (único)
name             text
type             text          -- place type GMB
address          text
phone            text
rating           numeric
review_count     integer
has_website      boolean
opp_score        integer       -- 0-100
stage            text          -- enum: report|demo|touch|negotiation|closed|discarded
demo_url         text          -- subdomínio gerado
capture_mode     text          -- raio | pontual
lat              numeric
lng              numeric
gmaps_uri        text
created_at       timestamptz
updated_at       timestamptz
user_id          uuid FK → auth.users
```

### Tabela `lead_events`
```
id               uuid PK
lead_id          uuid FK → leads
event_type       text          -- report_created|demo_generated|stage_changed|note|reminder|ai_suggestion
source           text          -- auto|manual|ai|system
title            text
body             text
metadata         jsonb         -- dados livres por tipo de evento
stage_from       text
stage_to         text
scheduled_at     timestamptz   -- para lembretes (pg_cron)
triggered        boolean       -- default false
created_at       timestamptz
user_id          uuid FK → auth.users
```

### Tabela `deals`
```
id               uuid PK
lead_id          uuid FK → leads (1:1)
product_sold     text          -- landing|store|booking|custom
value_eur        numeric
closed_at        timestamptz
notes            text
```

**Regra imutável:** `lead_events` nunca é editado nem apagado. Só se insere. Estado actual lê-se sempre de `leads.stage`.

---

## Algoritmo de score de oportunidade (0–100)

```
score = (
  taxa_sem_website_nicho   × 30  -- % sem website dos vizinhos do mesmo tipo (raio 1km)
  + min(review_count, 200) / 200 × 25  -- volume de reviews (cap 200)
  + (rating / 5)                 × 20  -- rating normalizado
  + has_phone                    × 15  -- telefone disponível
  + has_hours                    × 10  -- horário preenchido
)
```

---

## Pipeline de pesquisa — Modo Raio

```
1. Geocoding          → morada → coords            SKU Essentials  ~€0.005/req
2. Nearby Search      → places por type + raio      SKU Basic       ~€0.030/req
   FieldMask: places.id, places.displayName, places.primaryType,
              places.businessStatus, places.rating, places.userRatingCount
3. Pré-filtro local   → businessStatus=OPERATIONAL, rating>0, reviews>0   custo zero
4. Place Details      → 1 req por candidato         SKU Enterprise  ~€0.035/req
   FieldMask: id, displayName, nationalPhoneNumber, formattedAddress,
              regularOpeningHours, rating, userRatingCount,
              primaryTypeDisplayName, googleMapsUri, businessStatus, websiteUri
5. Filtro hasWebsite  → websiteUri da Place Details (Enterprise SKU) custo zero
7. Claude Haiku       → relatório de oportunidade                   ~€0.003/empresa
```

**Custo estimado por lead (modo raio):** ~€0.022–0.040

## Pipeline de pesquisa — Modo Pontual

```
1. GPS browser        → coordenadas automáticas                      custo zero
2. Text Search        → nome + locationBias 500m     SKU Basic       ~€0.030/req
   FieldMask: places.id, places.displayName, places.primaryType,
              places.businessStatus, places.rating, places.userRatingCount
3. Place Details      → dados completos + websiteUri SKU Enterprise  ~€0.035/req
4. Nearby context     → concorrentes 1km             SKU Basic       ~€0.030/req
   (corre em paralelo com step 3)
6. Claude Haiku       → relatório instantâneo                        ~€0.003/req
```

**Custo estimado por pesquisa pontual:** ~€0.080  
**Target de latência:** <3 segundos (steps 3+5 em paralelo)

### Detecção de website — via websiteUri (Enterprise SKU)

Decisão tomada: usar `websiteUri` da Place Details (Enterprise SKU ~€0.035/req) para detecção fiável de website. O DNS check local foi descartado por ser pouco fiável (falsos negativos frequentes — e.g., nomes de empresa que não correspondem ao domínio).

O campo `websiteUri` é incluído no FieldMask de Place Details e serve como fonte autoritativa.

---

## Nichos prioritários e place types

| Prioridade | Nicho | Place Types | Taxa sem website |
|---|---|---|---|
| A | Beleza e estética | beauty_salon, hair_salon, nail_salon, spa, barber_shop | 65–75% |
| A | Saúde local | physiotherapist, dentist, veterinary_care, optician, psychologist | 45–60% |
| A | Serviços técnicos | car_repair, electrician, plumber, roofing_contractor, painter, locksmith | 70–85% |
| B | Restauração | restaurant, cafe, bakery, bar, meal_takeaway | 55–65% |
| C | Comércio local | clothing_store, florist, gift_shop, furniture_store | 50–60% |

---

## Geração de landing page demo

**Fluxo:**
1. Utilizador clica "Gerar demo" no relatório do lead
2. Claude Haiku recebe dados do lead + template system prompt (cacheado)
3. Gera HTML completo (single-file, CSS inline, mobile-first)
4. API Route faz push para GitHub repo `demos/` via GitHub API
5. Vercel deploy automático → URL `[slug-empresa].lokiq.app`
6. URL guardada em `leads.demo_url` + evento `demo_generated` em `lead_events`

**Template base por nicho** (5 templates: beleza, saúde, técnico, restauração, comércio)  
**Tempo de geração:** <8 segundos  
**Custo:** ~€0.015 por landing page (Haiku, ~3k tokens output)

---

## Fases de desenvolvimento

### Fase 0 — Preparação (Semana 1) ✅
**Duração:** 3–4 dias

- [x] Setup repositório GitHub (monorepo Next.js)
- [x] Setup Supabase — projeto, schema SQL completo, RLS policies
- [x] Setup Google Cloud — habilitar Places API (New), criar API key
- [x] Setup Anthropic API key
- [ ] Setup Vercel — link ao repo, variáveis de ambiente
- [ ] Configurar domínio principal + wildcard DNS para demos (`*.lokiq.app`)
- [ ] Setup GitHub API token para push de demos
- [x] Testar manualmente cada API com health check (`/api/health`)

**Variáveis de ambiente necessárias:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_PLACES_API_KEY
ANTHROPIC_API_KEY
GITHUB_TOKEN
GITHUB_REPO_DEMOS
NEXT_PUBLIC_DEMOS_DOMAIN
```

---

### Fase 1 — Core da Pesquisa (Semanas 2–3)
**Duração:** 8–10 dias

**Semana 2 — Pipeline Places API**
- [x] API Route `/api/search/nearby` — Nearby Search com FieldMask + custo + maxResults
- [x] API Route `/api/search/text` — Text Search com locationBias
- [x] API Route `/api/places/details` — Place Details com FieldMask Enterprise (websiteUri)
- [x] Detecção de website via `websiteUri` (Enterprise SKU) — substitui DNS check
- [x] Função `calcScore()` — algoritmo de scoring 0-100
- [x] Contexto de vizinhança (noWebsiteRate calculado a partir de Place Details)
- [x] Testes unitários (Vitest): `calcScore` (100%), `classifyWebsite`, `parseReportJson`, `detectTech`, `rateLimit` — 36 testes
- [x] Rate limiting in-memory nas API Routes que gastam chave (search, geocode, ai/report, leads report/refresh)

**Semana 3 — UI de Pesquisa**
- [x] Página `/search` — formulário Modo Raio (morada + raio + nicho opcional)
- [x] Página `/search` — tab Modo Pontual (nome + geocode server-side)
- [x] Componente `LeadCard` — nome, tipo, score, rating, badge "sem website", custo
- [x] Loading states e error handling
- [x] Guardar lead em `leads` ao clicar "Guardar"
- [x] Modal de relatório IA (sinais, contexto, pitch, confiança)
- [x] Filtro no Modo Raio: só sem site próprio (default) ou todos os estabelecimentos
- [x] Classificação de presença digital: none | social (só Facebook/Instagram) | website
- [x] Bloqueio de resultados (`blocked_places`) — botão nos resultados + página `/blocked`; excluídos antes dos Place Details
- [x] Exclusão de leads já guardados nas pesquisas (cache de place_id)
- [x] Nichos expandidos: 9 nichos, ~65 sub-tipos seleccionáveis (chips)
- [x] Fingerprint de tecnologia do site (WordPress/Wix/etc + sites quebrados) no relatório IA

---

### Fase 2 — Relatório e IA (Semana 4)
**Duração:** 5–6 dias

- [x] System prompt base (cacheado) para relatório de oportunidade
- [x] API Route `/api/ai/report` — Claude Haiku, prompt caching activado
- [ ] Componente `ReportView` — score, sinais, contexto de mercado, pitch sugerido
- [ ] Prompt e API Route `/api/ai/demo` — geração de landing page HTML
- [ ] 5 templates base (um por nicho prioritário) no system prompt
- [ ] GitHub push automático + Vercel deploy da demo
- [ ] Botão "Ligar agora" (tel: link), "Guardar lead", "Gerar demo"
- [ ] Testes de output qualidade do relatório (10 empresas reais por nicho)

**System prompt structure (relatório):**
```
[CACHED] Role + instruções de formato + regras de scoring + 
         definição de cada campo do output JSON + 
         exemplos de pitch por nicho (5 nichos)

[VARIABLE] dados da empresa + contexto de mercado (concorrentes)
```

---

### Fase 3 — Pipeline CRM (Semana 5)
**Duração:** 5–6 dias

- [x] Página `/leads` — Kanban view (6 colunas de stage)
- [x] Componente `KanbanBoard` — drag ou click para mover stage
- [x] API Route `/api/leads/[id]/stage` — muda stage + insere evento
- [x] Componente `LeadDetail` — tabs: Timeline | Mover Stage | Nota | Dados
- [x] Componente `Timeline` — lista de eventos ordenados por data
- [x] API Route `/api/leads/[id]/events` — GET + POST
- [x] Formulário de nota manual (tipo + texto livre)
- [ ] Lembretes: inserção de evento com `scheduled_at`
- [ ] pg_cron job no Supabase — verifica lembretes a cada hora
- [ ] Sugestão IA ao registar nota longa (Claude resume + sugere próximo passo)

---

### Fase 4 — Auth e Polish (Semana 6)
**Duração:** 4–5 dias

- [ ] Supabase Auth — magic link (email) para MVP, sem password
- [ ] RLS policies em todas as tabelas (`user_id = auth.uid()`)
- [ ] Middleware Next.js — proteger rotas autenticadas
- [ ] Página `/dashboard` — métricas: leads por stage, taxa de conversão, revenue fechado
- [ ] Filtros no `/leads` — por nicho, por região, por data, por score
- [ ] Mobile responsiveness (Modo Pontual é mobile-first)
- [ ] PWA básico — `manifest.json` + service worker para usar como app no telemóvel
- [ ] Error boundaries, loading skeletons, empty states
- [ ] Testes end-to-end com Playwright (fluxo principal: pesquisa → lead → demo → pipeline)

---

### Fase 5 — Validação e Lançamento (Semana 7–8)
**Duração:** 1–2 semanas

- [ ] 20 pesquisas reais em 3 nichos diferentes (beleza, técnico, restauração)
- [ ] Validar qualidade dos relatórios gerados
- [ ] Validar taxa de detecção "sem website" (comparar com verificação manual)
- [ ] Primeiro ciclo completo: pesquisa → relatório → demo → contacto → registo no pipeline
- [ ] Monitorização de custos Google Places API (alertas de billing no GCP)
- [ ] Ajuste de FieldMasks com base em custos reais observados
- [ ] Documentação de uso pessoal

---

## Custos estimados

### Infra mensal (MVP pessoal)

| Serviço | Plano | Custo/mês |
|---|---|---|
| Vercel | Free (Hobby) | €0 |
| Supabase | Free tier | €0 |
| Google Places API | Pay-as-you-go | €20–80 |
| Claude API (Haiku) | Pay-as-you-go | €5–25 |
| Domínio + wildcard DNS | Cloudflare | ~€1 |
| **Total** | | **€26–106** |

### Custo por operação

| Operação | Custo |
|---|---|
| Pesquisa modo raio (20 leads) | ~€0.80 |
| Pesquisa modo raio (50 leads) | ~€1.80 |
| Pesquisa pontual (1 empresa) | ~€0.08 |
| Geração de relatório (Haiku) | ~€0.003 |
| Geração de landing page demo | ~€0.015 |
| Lead completo (raio, com demo) | ~€0.05 total |

### Custo de desenvolvimento (tempo estimado)
- Solo developer, 6–8 semanas parciais (~4h/dia)
- Sem custo de equipa na Fase 1

---

## Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Custo Google Places escala | Alto | FieldMask obrigatório em todos os requests; alertas de billing; cache de place_id já pesquisados |
| Custo `websiteUri` SKU Enterprise | Médio | Incluído no FieldMask de Place Details; custo controlado via `maxResults` |
| Qualidade dados GMB incompletos | Médio | Pré-filtro por rating + reviews > 0 antes de Place Details |
| Rate limits Places API | Médio | Queue de requests com `p-limit` (max 10 concurrent); retry com backoff |
| RGPD — dados de empresas | Médio | B2B é mais permissivo; dados são públicos do GMB; adicionar privacy policy |
| websiteUri falso negativo | Baixo | Raro — Google Maps é fonte autoritativa; empresa pode não ter registado no GMB |

---

## Estrutura de pastas

```
lokiq/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (app)/
│   │   ├── search/          # Modo Raio + Pontual
│   │   ├── leads/           # Kanban pipeline
│   │   ├── leads/[id]/      # Detalhe do lead + timeline
│   │   └── dashboard/       # Métricas
│   └── layout.tsx
├── components/
│   ├── search/              # SearchForm, ResultsList, LeadCard
│   ├── report/              # ReportView, ScoreDisplay, PitchBox
│   ├── pipeline/            # KanbanBoard, LeadDetail, Timeline
│   └── ui/                  # Shared (Button, Badge, Card...)
├── lib/
│   ├── places/              # nearbySearch, textSearch, placeDetails
│   ├── website/             # checkWebsite (DNS + HTTP HEAD)
│   ├── scoring/             # calcScore
│   ├── ai/                  # generateReport, generateDemo (Claude)
│   └── supabase/            # client, server, types
├── app/api/
│   ├── search/nearby/
│   ├── search/text/
│   ├── places/details/
│   ├── ai/report/
│   ├── ai/demo/
│   └── leads/[id]/
│       ├── stage/
│       └── events/
├── supabase/
│   ├── migrations/          # SQL do schema
│   └── functions/           # Edge functions (lembretes)
└── tests/
    ├── unit/
    └── e2e/                 # Playwright
```

---

## Definition of Done — Fase 1

A Fase 1 está concluída quando:

1. Modo Raio devolve lista de leads com score num raio definido por nicho
2. Modo Pontual identifica empresa por nome com GPS em <3 segundos
3. Relatório Claude gerado automaticamente com score, sinais, contexto e pitch
4. Demo landing page publicada em subdomínio em <10 segundos
5. Pipeline Kanban funcional com timeline de eventos imutável
6. Notas manuais e lembretes operacionais
7. Auth com magic link a proteger todas as rotas
8. 20 leads reais testados com taxa de detecção "sem website" >80% de precisão
9. Custo por lead confirmado <€0.05 em condições normais
10. App usável no telemóvel (PWA) para o Modo Pontual em campo
