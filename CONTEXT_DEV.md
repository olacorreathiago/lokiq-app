# LOKIQ — Contexto de Desenvolvimento
> Consultar antes de iniciar qualquer tarefa. Garante coerência entre sessões.

---

## Produto e stack

**Lokiq Fase 1** — Prospecting Engine pessoal para PMEs sem website.  
**Stack:** Next.js 15 (App Router) · Supabase · Google Places API (New) · Claude Haiku 4.5 · Vercel  
**Repositório:** monorepo, estrutura em `/app`, `/components`, `/lib`, `/app/api`, `/supabase`, `/tests`  
**Roadmap completo:** `ROADMAP_FASE1.md`

---

## Regras de arquitectura

### API e servidor
- Toda a lógica com chaves secretas vive em **API Routes** (`/app/api/`), nunca no cliente
- Variáveis `NEXT_PUBLIC_*` são seguras para o cliente; as restantes são server-only
- Cada API Route tem validação de input (Zod) antes de qualquer operação
- Rate limiting em todas as rotas públicas (`upstash/ratelimit` ou middleware simples)

### Base de dados
- **RLS activo** em todas as tabelas — políticas `user_id = auth.uid()`
- `lead_events` é **imutável** — só INSERT, nunca UPDATE/DELETE
- Estado actual do lead lê-se sempre de `leads.stage`, nunca de eventos
- Migrações em `/supabase/migrations/` com timestamp — nunca alterar ficheiro existente
- Usar `supabase-js` server client (service role) apenas em API Routes

### Google Places API
- **FieldMask obrigatório** em todos os requests — nunca omitir
- FieldMask mínimo para Nearby/Text Search: `places.id,places.displayName,places.primaryType,places.businessStatus,places.rating,places.userRatingCount`
- FieldMask para Place Details: `id,displayName,nationalPhoneNumber,formattedAddress,regularOpeningHours,rating,userRatingCount,primaryTypeDisplayName,googleMapsUri,businessStatus`
- **Nunca pedir `websiteUri`** (SKU Enterprise) — usar `checkWebsite()` com DNS em vez disso
- Nunca pedir `reviews`, `photos` no MVP
- Requests paralelos com `Promise.all()` onde possível (Place Details + Nearby context)
- Cache de `place_id` na tabela `leads` para não re-pesquisar o mesmo negócio

### Claude API
- Modelo: **claude-haiku-4-5** (único modelo a usar na Fase 1 — custo)
- **Prompt caching obrigatório** no system prompt — system prompt é sempre fixo e longo
- Output sempre em **JSON estruturado** — system prompt define schema exacto
- `max_tokens: 1024` para relatórios, `max_tokens: 4096` para landing pages
- Nunca usar Sonnet ou Opus na Fase 1 sem justificação de custo documentada
- Tratar erros da API graciosamente — fallback para relatório parcial se Claude falhar

---

## Regras de código

### Geral
- **TypeScript strict** — sem `any`, sem `@ts-ignore` não justificado
- Funções puras para lógica de negócio (`lib/`) — sem side effects, fáceis de testar
- Async/await em vez de `.then()` — consistência
- Erros explícitos: `throw new Error('mensagem descritiva')`, nunca `console.error` silencioso
- Sem `console.log` em produção — usar `logger` ou remover antes de commit

### Nomenclatura
- Ficheiros: `kebab-case` (`place-details.ts`, `lead-card.tsx`)
- Componentes React: `PascalCase` (`LeadCard`, `KanbanBoard`)
- Funções: `camelCase` (`calcScore`, `checkWebsite`, `generateReport`)
- Constantes: `SCREAMING_SNAKE` (`MAX_RADIUS_METERS`, `DEFAULT_SCORE_WEIGHTS`)
- Tipos/Interfaces: `PascalCase` com prefixo descritivo (`Lead`, `LeadEvent`, `PlaceCandidate`)

### Componentes React
- Server Components por defeito — Client Component (`'use client'`) só quando necessário (interactividade, hooks)
- Props tipadas com interface explícita
- Loading e error states em todos os componentes que fazem fetch
- Sem lógica de negócio em componentes — delegar para `lib/`

---

## Segurança

### Chaves e secrets
- **Nunca** commitar `.env.local` ou qualquer ficheiro com chaves
- `.env.example` no repo com todas as variáveis necessárias (sem valores)
- API keys Google e Anthropic com **restrições**: Google → HTTP referrers da app; Anthropic → só server-side
- Supabase service role key: **nunca** exposta ao cliente

### Input validation
- Toda a entrada do utilizador validada com **Zod** antes de usar
- Sanitizar strings antes de inserir em queries (Supabase parameterized queries por defeito)
- Coordenadas GPS validadas (lat: -90 a 90, lng: -180 a 180)
- Raio de pesquisa: máximo 10.000 metros (evitar requests massivos)
- Nome de empresa: máximo 100 chars, strip HTML

### API Routes
- Verificar sessão Supabase em todas as rotas protegidas
- Retornar sempre erros genéricos ao cliente (não expor stack traces)
- Headers de segurança via `next.config.js` (X-Frame-Options, CSP básico)

---

## Testes

### Estratégia
- **Unit tests** (`/tests/unit/`) para funções puras: `calcScore`, `checkWebsite`, `slugify`, parsing de dados GMB
- **Integration tests** para API Routes com mocks das APIs externas (Places, Claude)
- **E2E tests** (`/tests/e2e/`) com Playwright para fluxos críticos

### Fluxos E2E obrigatórios
1. Pesquisa modo raio → lista resultados → guardar lead
2. Pesquisa modo pontual → relatório → gerar demo → URL publicada
3. Mover lead pelo pipeline completo → evento registado na timeline
4. Adicionar nota manual → aparece na timeline

### Cobertura mínima
- `lib/scoring/calcScore` — 100% (é o core do produto)
- `lib/website/checkWebsite` — 100% (mock de DNS e fetch)
- `lib/places/*` — testes com fixtures de resposta real da API
- Componentes críticos: snapshot tests para `ReportView`, `KanbanBoard`

### Fixtures
- Guardar respostas reais da Places API em `/tests/fixtures/` para usar em testes sem custo
- Uma fixture por nicho prioritário (beleza, saúde, técnico, restauração)

---

## Gestão de custos

### Monitorização
- Alertas de billing no Google Cloud Console: €20, €50, €100
- Log de uso da Anthropic API por operação (relatório vs landing page)
- Query semanal no Supabase para contar operações e estimar custo

### Regras de optimização
- **Cache de place_id**: antes de qualquer Place Details, verificar se `place_id` já existe em `leads` — se sim, usar dados guardados
- **Não re-gerar relatório** se já existe e dados GMB não mudaram (verificar `updated_at`)
- **Nearby context em paralelo** com Place Details — `Promise.all()` obrigatório
- Prompt caching Claude: system prompt >1024 tokens garante cache hit após 1ª chamada
- Batch API Claude para operações offline (rescoring nocturno de leads, se implementado)

---

## Fluxo de trabalho por tarefa

### Antes de começar
1. Ler este ficheiro
2. Verificar a fase actual no `ROADMAP_FASE1.md`
3. Confirmar que a tarefa tem definição clara de "done"
4. Identificar que APIs externas são usadas e qual o custo

### Durante o desenvolvimento
1. Criar tipos TypeScript primeiro, depois implementação
2. Funções puras em `lib/` antes de integrar em API Routes
3. Testar a função isolada antes de ligar à UI
4. Verificar FieldMask antes de qualquer request Places API

### Antes de commitar
1. `npm run typecheck` — zero erros TypeScript
2. `npm run lint` — zero warnings
3. Testes unitários das funções alteradas — passar
4. Sem `console.log`, sem chaves hardcoded, sem `TODO` não documentado
5. Variáveis de ambiente novas adicionadas ao `.env.example`

---

## Convenções de git

```
feat: adiciona modo pontual com GPS
fix: corrige FieldMask no Place Details (remover websiteUri)
refactor: extrai calcScore para lib/scoring
test: adiciona fixtures para nicho beleza
chore: actualiza dependências
```

Branches: `main` (produção) · `develop` (integração) · `feat/nome-da-feature`  
PRs para `main` só via `develop` — nunca push directo para `main`

---

## Variáveis de ambiente (referência)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # server-only

# Google Places API
GOOGLE_PLACES_API_KEY=               # server-only, restrição HTTP referrer

# Anthropic
ANTHROPIC_API_KEY=                   # server-only

# Deploy de demos
GITHUB_TOKEN=                        # server-only
GITHUB_REPO_DEMOS=                   # ex: username/lokiq-demos
NEXT_PUBLIC_DEMOS_DOMAIN=            # ex: demos.lokiq.app
```

---

## Estados do pipeline (enum)

```typescript
type LeadStage =
  | 'report'        // Relatório gerado, sem acção
  | 'demo'          // Demo landing page gerada
  | 'touch'         // First touch feito
  | 'negotiation'   // Em negociação
  | 'closed'        // Negócio fechado
  | 'discarded'     // Sem interesse (requer motivo)
```

## Tipos de evento (enum)

```typescript
type EventType =
  | 'report_created'
  | 'demo_generated'
  | 'stage_changed'
  | 'note_added'        // manual
  | 'call_logged'       // manual
  | 'meeting_logged'    // manual
  | 'objection_logged'  // manual
  | 'reminder_set'      // system
  | 'reminder_fired'    // system
  | 'ai_suggestion'     // ai

type EventSource = 'auto' | 'manual' | 'ai' | 'system'
```

---

## Notas de produto (decisões tomadas)

- `websiteUri` (SKU Enterprise) **não usado** — DNS check local cobre 90%+ dos casos
- Haiku 4.5 é o modelo para tudo na Fase 1; Sonnet só na Fase 2 se qualidade insuficiente
- Modo Pontual é **mobile-first** — UI desenhada para ecrã de telemóvel primeiro
- Demo landing page é HTML estático single-file — sem dependências externas
- `lead_events` é append-only — decisão arquitectural permanente
- Score 0-100 com 5 dimensões fixas — não alterar pesos sem re-score de todos os leads
- Máximo 10.000m de raio de pesquisa — protecção de custos e qualidade de resultados
