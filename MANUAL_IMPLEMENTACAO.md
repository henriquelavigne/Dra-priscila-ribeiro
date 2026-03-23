# Manual de Implementação — Dra Priscila Agendor
## Sistema de Gestão de Plantões

> **Destinatário:** Gemini / Antigravity
> **Finalidade:** Handoff completo do sistema para continuação do desenvolvimento
> **Estado atual:** Blocos 16–26 implementados e buildando sem erros
> **Stack:** Next.js 14 · Prisma 7 · Supabase · Baileys · OpenAI · Railway

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                     │
│  Next.js 14 App Router · Tailwind · shadcn/ui · Prisma  │
│                                                          │
│  /dashboard  /schedule  /finances  /workplaces           │
│  /settings ← NOVO (configuração do bot + status)         │
│                                                          │
│  API Routes: /api/settings  /api/shifts  /api/workplaces │
│              /api/payments  /api/auto-notes  /api/export │
└──────────────┬──────────────────────────┬───────────────┘
               │ HTTP (axios)              │ Prisma
               ▼                          ▼
┌──────────────────────┐      ┌─────────────────────────┐
│  AGENDOR BOT         │      │  SUPABASE (PostgreSQL)  │
│  Railway · Node.js   │      │                         │
│                      │      │  workplaces             │
│  Baileys (WhatsApp)  │      │  shifts                 │
│  OpenAI GPT-4o-mini  │      │  payments               │
│  Whisper (áudio)     │      │  auto_notes             │
│  node-cron           │      │  audit_log              │
│  Supabase auth store │      │  users                  │
│                      │      │  system_config ← NOVO   │
│  Heartbeat → /api    │      │  bot_sessions           │
└──────────────────────┘      └─────────────────────────┘
```

---

## 2. Estrutura de Pastas

```
dra.priscila.oftalmo/
├── frontend/                          # Next.js 14
│   ├── prisma/
│   │   └── schema.prisma              # Models: Workplace, Shift, Payment,
│   │                                  #   AutoNote, User, SystemConfig
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── settings/route.ts  # GET + PUT /api/settings
│   │   │   │   ├── shifts/            # CRUD plantões
│   │   │   │   ├── workplaces/        # CRUD locais
│   │   │   │   ├── payments/          # CRUD pagamentos
│   │   │   │   ├── auto-notes/        # Lembretes automáticos
│   │   │   │   ├── dashboard/         # Dados consolidados
│   │   │   │   └── export/            # Backup JSON
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── schedule/page.tsx
│   │   │   ├── finances/page.tsx
│   │   │   ├── workplaces/page.tsx
│   │   │   └── settings/page.tsx      # NOVO — config + status bot
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── BottomNav.tsx      # Nav inclui /settings (ícone Config)
│   │   │   │   └── PageHeader.tsx
│   │   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── workplace/
│   │   │   ├── shift/
│   │   │   ├── finance/
│   │   │   └── dashboard/
│   │   ├── services/
│   │   │   ├── settings.service.ts    # NOVO — SystemConfig CRUD
│   │   │   ├── workplace.service.ts
│   │   │   ├── shift.service.ts
│   │   │   ├── payment.service.ts
│   │   │   └── auto-note.service.ts
│   │   └── lib/
│   │       ├── prisma.ts
│   │       ├── validators.ts
│   │       └── constants.ts
│
└── backend/agendor-bot/               # Node.js · Railway
    ├── src/
    │   ├── config/index.ts            # Env vars + DRA_PHONE_NUMBER opcional
    │   ├── index.ts                   # Bootstrap: applyRemoteSettings → initWhatsApp → initCron
    │   ├── whatsapp/
    │   │   ├── client.ts              # Baileys + Supabase/local auth
    │   │   ├── auth-store.ts          # Sessão persistida no Supabase
    │   │   ├── handler.ts             # Fluxo: guards → áudio → sim check → IA → executor
    │   │   └── sender.ts             # sendMessage, sendTyping, stopTyping
    │   ├── ai/
    │   │   ├── agent.ts               # GPT-4o-mini + Promise.allSettled + JSON guard
    │   │   ├── prompts.ts             # SYSTEM_PROMPT + buildSystemPrompt() (ano dinâmico)
    │   │   └── transcriber.ts         # Whisper → texto PT-BR
    │   ├── executor/
    │   │   ├── index.ts               # Orquestrador: create/cancel/update/query/simulate
    │   │   ├── create.ts              # Cria plantão + informa valor padrão
    │   │   ├── cancel.ts              # Cancela + mensagem específica por status
    │   │   ├── query.ts               # Resposta direta do GPT
    │   │   └── simulate.ts            # Estado pendente + confirmações PT-BR ampliadas
    │   ├── api/
    │   │   ├── client.ts              # axios com interceptor de log
    │   │   ├── settings.ts            # fetchRemoteSettings + sendHeartbeat
    │   │   ├── workplaces.ts
    │   │   ├── shifts.ts
    │   │   ├── finances.ts
    │   │   └── types.ts
    │   ├── notifications/
    │   │   ├── weekly.ts              # Notificação semanal com guard no getSocket()
    │   │   └── cron.ts                # Notificação semanal + heartbeat a cada 2min
    │   └── utils/
    │       ├── dates.ts               # formatDateBR, formatCurrency, etc.
    │       ├── formatter.ts           # formatSuccessMessage, formatErrorMessage
    │       └── logger.ts             # pino (pretty em dev, JSON em prod)
    ├── .env.example
    ├── Procfile                       # web: npm start
    └── railway.toml                  # NIXPACKS · ON_FAILURE restart
```

---

## 3. Banco de Dados — Prisma Schema Completo

```prisma
// frontend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ShiftStatus   { scheduled completed cancelled }
enum PaymentStatus { pending partial paid overdue }
enum AutoNoteStatus { active resolved }

model Workplace {
  id                  String   @id @default(uuid())
  name                String
  color               String
  averageValue        Decimal  @map("average_value")
  paymentDeadlineDays Int      @map("payment_deadline_days")
  notes               String?
  isActive            Boolean  @default(true) @map("is_active")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt    @map("updated_at")
  shifts    Shift[]
  autoNotes AutoNote[]
  @@map("workplaces")
}

model Shift {
  id            String      @id @default(uuid())
  workplaceId   String      @map("workplace_id")
  date          DateTime    @db.Date
  expectedValue Decimal     @map("expected_value")
  actualValue   Decimal?    @map("actual_value")
  status        ShiftStatus @default(scheduled)
  notes         String?
  source        String      @default("web")
  sourceDetail  String?     @map("source_detail")
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt     @map("updated_at")
  workplace Workplace @relation(fields: [workplaceId], references: [id])
  payment   Payment?
  autoNotes AutoNote[]
  @@map("shifts")
  @@index([date])
  @@index([workplaceId])
  @@index([status])
}

model Payment {
  id             String        @id @default(uuid())
  shiftId        String        @unique @map("shift_id")
  amountReceived Decimal       @map("amount_received")
  paymentDate    DateTime      @map("payment_date") @db.Date
  status         PaymentStatus
  notes          String?
  createdAt      DateTime      @default(now()) @map("created_at")
  shift Shift @relation(fields: [shiftId], references: [id])
  @@map("payments")
}

model AutoNote {
  id            String         @id @default(uuid())
  workplaceId   String         @map("workplace_id")
  shiftId       String         @map("shift_id")
  type          String         // "payment_overdue" | "partial_payment"
  message       String
  amountPending Decimal        @map("amount_pending")
  status        AutoNoteStatus @default(active)
  dueDate       DateTime       @map("due_date")
  createdAt     DateTime       @default(now()) @map("created_at")
  resolvedAt    DateTime?      @map("resolved_at")
  workplace Workplace @relation(fields: [workplaceId], references: [id])
  shift     Shift     @relation(fields: [shiftId], references: [id])
  @@map("auto_notes")
}

model AuditLog {
  id         String   @id @default(uuid())
  entityType String   @map("entity_type")
  entityId   String   @map("entity_id")
  action     String
  changes    Json
  source     String   @default("web")
  createdAt  DateTime @default(now()) @map("created_at")
  @@map("audit_log")
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt    @map("updated_at")
  @@map("users")
}

// NOVO — configurações do sistema (chave/valor)
model SystemConfig {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("system_config")
}
```

**Chaves usadas em `system_config`:**

| key | Descrição | Exemplo |
|---|---|---|
| `botPhoneNumber` | Número monitorado pelo bot | `5575999999999` |
| `botName` | Nome do bot | `Agendor` |
| `botLastSeen` | Último heartbeat do bot (ISO) | `2026-03-23T14:00:00.000Z` |
| `botStatus` | Status declarado pelo bot | `online` |

**Tabela Supabase adicional** (para sessão Baileys — criada manualmente):

```sql
CREATE TABLE bot_sessions (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Variáveis de Ambiente

### Frontend (`frontend/.env`)

```env
DATABASE_URL="postgresql://postgres.[project]:[password]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[project].supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
NEXTAUTH_URL="http://localhost:3000"         # ou URL de produção
NEXTAUTH_SECRET="string_aleatória_32_chars"
```

### Bot (`backend/agendor-bot/.env`)

```env
OPENAI_API_KEY=sk-...
API_BASE_URL=https://dra-priscila-agendor.vercel.app/api

# DRA_PHONE_NUMBER é OPCIONAL — o bot buscará do painel /settings se não definido
# DRA_PHONE_NUMBER=5575999999999

BOT_NAME=Agendor
WEEKLY_NOTIFICATION_DAY=1        # 0=dom, 1=seg, ..., 6=sáb
WEEKLY_NOTIFICATION_HOUR=8
WEEKLY_NOTIFICATION_MINUTE=0

# Necessário para persistência de sessão no Railway (sem isso, QR a cada deploy)
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

---

## 5. Fluxo do Bot — Diagrama

```
WhatsApp mensagem recebida
         │
         ▼
    Guards básicos
    ┌─────────────────────────────────────────┐
    │ fromMe? → ignorar                       │
    │ grupo? → ignorar                        │
    │ não é o número da Dra.? → ignorar       │
    └─────────────────────────────────────────┘
         │
         ▼
    Extração de conteúdo
    ┌──────────────────┐   ┌─────────────────────────┐
    │ texto direto     │   │ áudio → Whisper → texto │
    └──────────────────┘   └─────────────────────────┘
         │
         ▼
    Rate limit (5 msgs / 10s) — enfileira se ultrapassado
         │
         ▼
    checkPendingSimulation(texto)
    ┌─────────────────────────────────────────────────┐
    │ Tem simulação pendente?                         │
    │   Expirou (>5min)? → "⏰ Simulação expirou..."  │
    │   "sim"/"bora"/"tá"/etc → executeActions()      │
    │   "não"/"cancela"/etc → "✓ Descartada"          │
    │   outro → null (processa como novo comando)     │
    └─────────────────────────────────────────────────┘
         │ null
         ▼
    sendTyping + slowTimer (30s → "⏳ Processando...")
         │
         ▼
    processCommand(texto)  ← Promise.race com timeout 45s
    [GPT-4o-mini via OpenAI]
    [Promise.allSettled para fetches paralelos]
    [JSON parse com try/catch]
         │
         ▼
    AgentResponse { understood, actions[], errors[], simulation?, query_response? }
         │
         ├─ simulation? → handleSimulation → salva pendingSimulations → envia preview
         │
         ├─ query_response? → executeQuery → "📋 resposta"
         │
         └─ actions[] → executeActions
              │
              ├─ create → executeCreate (informa valor padrão)
              ├─ cancel → executeCancel (mensagem por status: já cancelado/concluído)
              ├─ update → executeCancel → se ok → executeCreate
              └─ query/simulate → ignorado no executor
```

---

## 6. Módulos Principais — Referência Rápida

### `src/ai/agent.ts`
```typescript
export async function processCommand(command: string): Promise<AgentResponse>
// Usa Promise.allSettled para fetchWorkplaces + fetchShiftsByMonth x2
// GPT-4o-mini com response_format: json_object, temperature: 0.1
// JSON.parse com try/catch → fallback seguro
// Promise.race com timeout 45s no handler (não aqui)
```

### `src/ai/prompts.ts`
```typescript
export const SYSTEM_PROMPT: string           // template com "CURRENT_YEAR"
export function buildSystemPrompt(): string  // substitui CURRENT_YEAR pelo ano real
export function buildContext(workplaces, currentShifts, nextShifts): string
// Contexto: data atual + locais (id, nome, valor médio) + agenda 2 meses
```

### `src/executor/simulate.ts`
```typescript
// Estado em memória: Map<jid, { actions, timestamp }>
// TTL: 5 minutos
// CONFIRMATIONS: sim, s, ok, bora, tá, ótimo, claro, perfeito, faz, vai...
// DENIALS: não, nao, n, cancela, deixa, esquece, para, descarta...
// Expiração retorna mensagem: "⏰ A simulação expirou..."
export function handleSimulation(response: AgentResponse): string
export async function checkPendingSimulation(text: string): Promise<string | null>
```

### `src/notifications/cron.ts`
```typescript
// Job 1: notificação semanal (configurável por env)
// Job 2: heartbeat a cada 2min → PUT /api/settings { botLastSeen, botStatus: "online" }
export function initCron(): void
```

### `src/whatsapp/auth-store.ts`
```typescript
// Persiste sessão Baileys no Supabase (tabela bot_sessions)
// Fallback: localStorage auth_info/ se Supabase não configurado
export async function useSupabaseAuthState(): Promise<{ state, saveCreds }>
```

---

## 7. API Routes do Frontend

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/settings` | Retorna todas as config (botPhoneNumber, botLastSeen, etc.) |
| PUT | `/api/settings` | Salva config. Valida número: 10–15 dígitos |
| GET | `/api/workplaces` | Lista locais (`?activeOnly=true`) |
| POST | `/api/workplaces` | Cria local |
| GET/PUT/DELETE | `/api/workplaces/[id]` | Operações por ID |
| GET | `/api/shifts` | Lista plantões (`?month=X&year=Y`) |
| POST | `/api/shifts` | Cria plantão |
| GET/PUT/PATCH/DELETE | `/api/shifts/[id]` | Operações por ID (PATCH aceita `{action:"cancel"}`) |
| GET | `/api/shifts/by-date/[date]` | Plantões de uma data específica |
| GET | `/api/payments` | Lista pagamentos (`?month=X&year=Y`) |
| POST | `/api/payments` | Registra pagamento |
| GET/PUT | `/api/payments/[id]` | Operações por ID |
| GET | `/api/payments/summary` | Resumo financeiro |
| GET | `/api/auto-notes` | Lista lembretes (`?status=active\|resolved\|all`) |
| POST | `/api/auto-notes/check` | Dispara verificação de auto-notes |
| POST | `/api/auto-notes/[id]/resolve` | Marca como resolvido |
| GET | `/api/dashboard` | Dados consolidados do dashboard |
| GET | `/api/export` | Backup completo em JSON |

---

## 8. Design System

Cores customizadas em `tailwind.config.ts`:

```js
colors: {
  gold: {
    light:   "#E6C27A",
    DEFAULT: "#C5A059",
    dark:    "#A67C00",
  },
  sand: {
    light:   "#FAF9F6",
    DEFAULT: "#F9F6F0",
    dark:    "#EAEADF",
  }
}
```

Padrões visuais usados:

```
Cards:         bg-white/80 rounded-[20px] border border-sand-dark/50 shadow-luxury p-5
Botão primário: bg-slate-900 hover:bg-black text-white rounded-xl shadow-soft
Inputs:        rounded-xl border-sand-dark
Ícone seção:   w-9 h-9 rounded-xl bg-sand → ícone text-gold-dark
Skeleton:      animate-pulse + bg-sand-dark/bg-sand
Header sticky: bg-white/80 backdrop-blur-md border-b border-sand-dark
Nav ativa:     text-gold / Nav inativa: text-slate-400
```

---

## 9. Passos de Deploy

### Frontend (Vercel) — já em produção
```bash
cd frontend
npm run build   # verifica erros
# Push para branch main → Vercel deploy automático
```

### Bot (Railway) — deploy inicial

1. Criar conta em [railway.app](https://railway.app)
2. New Project → Deploy from GitHub → selecionar repo
3. Configurar **Root Directory**: `backend/agendor-bot`
4. Configurar variáveis de ambiente no painel Railway (seção 4 acima)
5. Deploy → acompanhar logs
6. **Nos logs**, um QR Code aparece — escanear com WhatsApp da Dra. Priscila
7. Após scan, sessão fica salva no Supabase → próximos deploys não pedem novo QR

### Verificar se bot está conectado
- Acessar `/settings` no painel do frontend
- Indicador verde "Conectado" = bot online e enviando heartbeat
- Indicador cinza "Sem dados" = bot nunca conectou ou sem variáveis Supabase

### Fix Prisma Client (IMPORTANTE após `prisma db push` com servidor rodando)
```bash
# 1. Parar o servidor dev (Ctrl+C)
# 2. No diretório frontend:
cd frontend && npx prisma generate
# 3. Reiniciar o servidor
npm run dev
```

---

## 10. Convenções do Projeto

### Padrão de serviço (frontend)
```typescript
// src/services/[entidade].service.ts
import { prisma } from "@/lib/prisma";
export async function listX(): Promise<X[]> { ... }
export async function createX(input: CreateXInput): Promise<X> { ... }
// Validação com Zod em src/lib/validators.ts
```

### Padrão de API route (frontend)
```typescript
// src/app/api/[rota]/route.ts
export async function GET(req: NextRequest) {
  try {
    const data = await service.listX();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/x]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Padrão de página (frontend)
```typescript
"use client";
// useState + useCallback + useEffect
// fetch("/api/...") direto (sem lib cliente)
// toast.error / toast.success via sonner
// SkeletonCard durante loading
// PageHeader com título
// main com max-w-lg mx-auto w-full px-4 py-4
```

### Padrão de executor (bot)
```typescript
// src/executor/[acao].ts
export async function executeX(action: AgentAction): Promise<ExecutionResult>
// Sempre retorna { success, message, count, dates?, workplaceName?, errors? }
// Log com logger.info/warn/error
// Erros individuais capturados, não lançam exceção
```

---

## 11. Blocos Implementados — Histórico

| Bloco | Descrição | Status |
|---|---|---|
| 16 | Setup do projeto bot + conexão Baileys + QR code | ✅ |
| 17 | Transcrição de áudio via Whisper | ✅ |
| 18 | Agente IA: GPT-4o-mini + contexto dinâmico | ✅ |
| 19 | Executor de ações: create, cancel, update, recorrência | ✅ |
| 20 | Consultas e simulações com estado pendente | ✅ |
| 21 | Notificação semanal + polimento (rate limit, debounce, errors) | ✅ |
| 22 | Deploy Railway + sessão Baileys persistida no Supabase | ✅ |
| 23 | Settings page + validação + campos botLastSeen/botStatus | ✅ |
| 24 | Correções críticas: JSON guard, getSocket guard, update abort, timeout 45s | ✅ |
| 25 | UX bot: expiração simulação, confirmações PT-BR, valor padrão, status cancel | ✅ |
| 26 | Heartbeat a cada 2min + indicador online/instável/offline no painel | ✅ |

---

## 12. Próximos Blocos Sugeridos

| Bloco | Ideia | Complexidade |
|---|---|---|
| 27 | Tela de histórico de conversas do bot (log de comandos executados) | Média |
| 28 | Notificação de plantão no dia seguinte (cron diário às 20h) | Baixa |
| 29 | Comando "relatório mensal" → bot envia PDF/resumo via WhatsApp | Alta |
| 30 | Multi-usuário: bot responde a outros números configurados no painel | Média |
| 31 | Comando de voz completo: Dra. pode pedir resumo financeiro por áudio | Baixa |
| 32 | PWA offline: cache das páginas principais para uso sem internet | Média |

---

## 13. Checklist de Verificação

### Bot
- [ ] `npm run build` → 0 erros TypeScript
- [ ] `npm run dev` → QR code aparece no terminal
- [ ] Enviar "oi" pelo WhatsApp → bot responde
- [ ] Enviar "agendar ipiaú dia 5" → plantão criado
- [ ] Enviar "cancela ipiaú dia 5" → plantão cancelado
- [ ] Enviar "quantos plantões tenho essa semana?" → resposta com 📋
- [ ] Enviar "quanto fica se pegar 2 plantões a mais?" → preview com sim/não
- [ ] Responder "bora" → ações aplicadas
- [ ] Heartbeat: acessar `/settings` → ponto verde após 2min

### Frontend
- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `/settings` carrega sem erro 500
- [ ] Salvar número → recarregar → persiste
- [ ] Dashboard → dados carregam
- [ ] `/workplaces` → locais listados
- [ ] `/schedule` → calendário com plantões
- [ ] `/finances` → pagamentos + auto-notes

---

*Projeto: **Dra Priscila Agendor** · Gerado em: 2026-03-23 · Versão do sistema: v1.1 (Bloco 26)*
