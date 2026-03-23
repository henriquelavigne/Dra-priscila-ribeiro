# Agendor Bot — Dra. Priscila Agendor

Bot de WhatsApp com IA para gestão de agenda oftalmológica. Permite à Dra. Priscila Ribeiro agendar, cancelar e consultar plantões por mensagem de texto ou áudio.

## Tecnologias

- **WhatsApp**: [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)
- **Transcrição de áudio**: OpenAI Whisper (`whisper-1`)
- **Inteligência artificial**: OpenAI GPT-4o-mini
- **Agendamento**: node-cron
- **API**: Integração com o sistema V1 (Next.js/Prisma)

## Pré-requisitos

- Node.js 18+
- npm 9+
- Conta OpenAI com créditos
- Acesso ao sistema V1 (Vercel)

## Configuração

1. Clone o repositório e entre na pasta:
   ```bash
   cd backend/agendor-bot
   npm install
   ```

2. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```

3. Preencha o `.env`:
   ```env
   OPENAI_API_KEY=sk-...           # Chave da OpenAI
   API_BASE_URL=https://...        # URL do sistema V1
   DRA_PHONE_NUMBER=5575999999999  # Número da Dra. (apenas dígitos)
   BOT_NAME=Agendor
   WEEKLY_NOTIFICATION_DAY=1       # 0=dom, 1=seg, ..., 6=sáb
   WEEKLY_NOTIFICATION_HOUR=8
   WEEKLY_NOTIFICATION_MINUTE=0
   ```

## Como rodar

**Desenvolvimento:**
```bash
npm run dev
```
Na primeira execução, um QR code aparecerá no terminal. Escaneie com o WhatsApp da Dra. Priscila em **Dispositivos Conectados → Conectar dispositivo**.

**Produção (Railway):**
```bash
npm run build
npm start
```

## Comandos suportados

### Agendamento
- `"agendar ipiau segunda"` — agenda plantão no próximo dia especificado
- `"agendar hcoe 25/03"` — agenda em data específica
- `"fixar toda segunda em abril no jaguaquara"` — agenda recorrente (todas as ocorrências)
- `"agendar ipiau segunda, serrinha terça e hcoe quinta"` — múltiplos plantões

### Cancelamento
- `"cancelar ipiau segunda"` — cancela plantão do local na data
- `"cancelar hcoe 25/03 e 27/03"` — cancela múltiplas datas

### Substituição
- `"trocar ipiau de segunda para terça"` — cancela e reagenda

### Consultas
- `"como está minha agenda da semana?"`
- `"quais dias tenho livre esse mês?"`
- `"quanto trabalhei esse mês?"`
- `"qual o valor pendente da serrinha?"`

### Simulações
- `"quanto fica se adicionar 2 ipiau em abril?"` — bot mostra preview
- Responda `"sim"` para confirmar ou `"não"` para descartar

### Áudio
Todos os comandos acima também funcionam por mensagem de voz. O bot transcreve via Whisper automaticamente.

## Notificação semanal

Toda segunda-feira às 08:00 (configurável), o bot envia automaticamente um resumo de pagamentos pendentes com:
- 🔴 Pagamentos vencidos (com dias de atraso)
- 🟡 Pagamentos parciais
- Total pendente consolidado

## Estrutura do projeto

```
src/
├── index.ts              # Entry point
├── config/               # Variáveis de ambiente tipadas
├── whatsapp/             # Conexão Baileys (client, handler, sender)
├── ai/                   # Agente GPT-4o-mini (agent, prompts, transcriber)
├── api/                  # Integração com API V1 (workplaces, shifts, finances)
├── executor/             # Execução de ações (create, cancel, query, simulate)
├── notifications/        # Notificação semanal (weekly, cron)
└── utils/                # Utilitários (dates, formatter, logger)
```
