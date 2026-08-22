# 🚗 FleetControl - Ride Hailing Corporativo

Sistema completo de gestão de frota e transporte corporativo com painel administrativo, rastreamento em tempo real, controle de permissões por cargo (RBAC), geofencing, máquina de estados para veículos e viagens, e exportação de relatórios.

---

## 📋 Sumário

- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Funcionalidades](#-funcionalidades)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Database](#-database)
- [Roles e Permissões](#-roles-e-permissões)
- [Máquinas de Estado](#-máquinas-de-estado)
- [API Routes](#-api-routes)
- [Serviço de Rastreamento (WebSocket)](#-serviço-de-rastreamento-websocket)
- [Relatórios e Exportação](#-relatórios-e-exportação)
- [Deploy](#-deploy)
- [Mudança de Stack](#-mudança-de-stack)
- [Licença](#-licença)

---

## 🛠 Tecnologias

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 16.x |
| Linguagem | TypeScript | 5.x |
| Estilização | Tailwind CSS | 4.x |
| UI Components | shadcn/ui (Radix UI) | latest |
| ORM | Prisma | 6.x |
| Banco (dev) | SQLite | - |
| Banco (prod) | PostgreSQL | 15+ |
| Autenticação | JWT (access + refresh tokens) | - |
| Estado Cliente | Zustand | 5.x |
| Validação | Zod | 4.x |
| Criptografia | bcryptjs | 3.x |
| Rastreamento | Socket.io | 4.x |
| Exportação | SheetJS (xlsx) | 0.18.x |
| Geofencing | Haversine (próprio) | - |

---

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────────┐
│                   Next.js App                   │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │  Dashboard  │  │    API Routes (/api/*)   │  │
│  │  (React)    │  │  Auth · CRUD · Reports   │  │
│  │  Zustand    │  │  JWT · RBAC · Audit     │  │
│  └──────┬──────┘  └──────────┬───────────────┘  │
│         │                    │                   │
│         └────────┬───────────┘                   │
│                  ▼                               │
│           Prisma ORM                             │
│                  │                               │
│         ┌────────┴────────┐                      │
│         ▼                 ▼                      │
│     SQLite (dev)    PostgreSQL (prod)            │
└─────────────────────────────────────────────────┘

┌─────────────────────┐
│  Tracking Service   │  ← Processo separado (porta 3003)
│  Socket.io Server   │     Salas: dashboard, ride-{id}
└─────────────────────┘
```

**Princípios:**
- **Monorepo single-page**: Dashboard inteiro é um SPA com navegação por estado (sem rotas Next.js para páginas)
- **API-first**: Toda lógica de negócio nos API routes; o frontend consome via `apiFetch()` com auto-refresh de token
- **Audit trail**: Toda mutação (create/update/delete) gera registro em `AuditLog`
- **State machines**: Transições de status de veículos e viagens são validadas por máquinas de estado

---

## ✨ Funcionalidades

### Gestão de Usuários
- CRUD completo com busca e paginação
- 4 papéis: SUPER_ADMIN, MANAGER, DRIVER, PASSENGER
- Ativação/desativação de contas
- Rate limiting no login (5 tentativas / 15 minutos)

### Gestão de Veículos
- Cadastro com placa, modelo, capacidade, cor, ano
- Status com máquina de estado (5 estados)
- Metadados customizáveis (chave-valor)
- Checkout/Devolução para motoristas

### Gestão de Motoristas
- Vinculação 1:1 com veículo
- Status: disponível / em viagem / offline
- Histórico de checkouts

### Gestão de Passageiros
- Vinculação a centros de custo
- Solicitação de viagens com geofencing

### Centros de Custo
- Cadastro com metadados customizáveis
- Controle orçamentário por departamento/filial

### Viagens (Rides)
- Ciclo completo: Solicitada → Despachada → Chegou → Em andamento → Concluída / Cancelada
- Despacho manual pelo manager/admin
- Validação geofencing (raio + horário + dia da semana)

### Regras de Disponibilidade
- Configuração por centro de custo
- Horário permitido, dias da semana, raio máximo (geofencing)

### Relatórios
- Exportação de viagens em **XLSX**, **CSV** e **JSON**
- Filtros por período, status, motorista, passageiro

### Rastreamento em Tempo Real
- Serviço WebSocket independente (Socket.io)
- Salas: painel geral + por viagem individual
- Simulação de posição para testes

### Auditoria
- Log automático de todas as mutações (who, what, when)
- Consulta com paginação e filtros por entidade

---

## 📁 Estrutura do Projeto

```
├── prisma/
│   ├── schema.prisma          # 12 modelos, SQLite (dev) / PostgreSQL (prod)
│   ├── seed.ts                # Dados iniciais (6 users, 3 veículos, etc.)
│   └── db/                    # SQLite local (gitignored)
├── src/
│   ├── app/
│   │   ├── page.tsx           # Página raiz → renderiza DashboardShell
│   │   ├── layout.tsx         # Layout global (fontes, metadata)
│   │   └── api/
│   │       ├── auth/          # login, logout, refresh, me
│   │       ├── users/         # CRUD de usuários
│   │       ├── vehicles/      # CRUD + metadata de veículos
│   │       ├── drivers/       # CRUD de motoristas
│   │       ├── passengers/    # CRUD de passageiros
│   │       ├── cost-centers/  # CRUD + metadata de centros de custo
│   │       ├── rides/         # CRUD + despacho de viagens
│   │       ├── rules/         # CRUD de regras de disponibilidade
│   │       ├── checkouts/     # Checkout + devolução de veículos
│   │       ├── reports/       # Exportação XLSX/CSV/JSON
│   │       ├── audit-logs/    # Consulta de logs de auditoria
│   │       ├── health/        # Health check
│   │       └── metrics/       # Métricas do dashboard
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── dashboard-shell.tsx  # SPA completo (sidebar + páginas)
│   │   │   └── login-form.tsx       # Formulário de login
│   │   └── ui/               # Componentes shadcn/ui
│   ├── lib/
│   │   ├── auth.ts           # JWT, bcrypt, rate limiting
│   │   ├── auth-middleware.ts # Extração do user do request
│   │   ├── audit.ts          # Função de log de auditoria
│   │   ├── state-machine.ts  # Transições de Vehicle e Ride
│   │   ├── geofencing.ts     # Haversine + validação temporal
│   │   ├── api.ts            # Client fetch com auto-refresh
│   │   ├── db.ts             # Instância do Prisma Client
│   │   └── utils.ts          # Utilitários (cn, etc.)
│   ├── stores/
│   │   └── auth-store.ts     # Zustand store (auth state)
│   ├── hooks/                # Hooks customizados
│   └── types/
│       └── index.ts          # TypeScript types/interfaces
├── mini-services/
│   └── tracking-service/     # Socket.io server (porta 3003)
├── download/                 # Documentação e assets (gitignored)
├── vercel.json               # Configuração de deploy Vercel
├── .env.example              # Template de variáveis de ambiente
└── package.json
```

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- **Node.js** 18.17+
- **npm** ou **bun**
- **Git**

### Setup Local

```bash
# 1. Clone o repositório
git clone https://github.com/superaplicativos/Ride-Hailing-Corporativo.git
cd Ride-Hailing-Corporativo

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações

# 4. Gere o Prisma Client e crie o banco
npx prisma generate
npx prisma db push

# 5. (Opcional) Popule com dados de seed
npx tsx prisma/seed.ts

# 6. Rode em desenvolvimento
npm run dev
```

Acesse `http://localhost:3000`

### Credenciais de Seed

| Papel | Email | Senha |
|-------|-------|-------|
| Super Admin | admin@fleet.com | admin123 |
| Manager | manager@fleet.com | manager123 |
| Motorista | driver1@fleet.com | driver123 |
| Passageiro | passenger1@fleet.com | passenger123 |

---

## 🔑 Variáveis de Ambiente

| Variável | Descrição | Dev | Produção |
|----------|-----------|-----|----------|
| `DATABASE_URL` | URL do banco de dados | `file:./db/custom.db` | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Chave secreta para access tokens | qualquer string | **gerar secret forte (32+ chars)** |
| `JWT_REFRESH_SECRET` | Chave secreta para refresh tokens | qualquer string | **gerar secret forte (32+ chars)** |
| `TRACKING_WS_PORT` | Porta do serviço de rastreamento | `3003` | `3003` ou outro disponível |

> ⚠️ **Em produção**, troque os secrets JWT e use PostgreSQL com SSL.

---

## 📜 Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento (porta 3000)
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # ESLint
npm run db:push      # Push do schema Prisma (sem migrations)
npm run db:generate  # Gerar Prisma Client
npm run db:migrate   # Criar e aplicar migrations
npm run db:reset     # Resetar banco + rodar seed
```

---

## 🗄 Database

### Modelos (12 entidades)

| Modelo | Descrição |
|--------|-----------|
| `User` | Usuários do sistema (todos os papéis) |
| `Vehicle` | Veículos da frota |
| `VehicleMetadata` | Metadados customizáveis dos veículos |
| `Driver` | Perfil de motorista (relação 1:1 com User e Vehicle) |
| `Passenger` | Perfil de passageiro (relação 1:1 com User) |
| `CostCenter` | Centros de custo departamentais |
| `CostCenterMetadata` | Metadados dos centros de custo |
| `AvailabilityRule` | Regras de disponibilidade (horário/dia/raio) |
| `Ride` | Viagens com ciclo de vida completo |
| `VehicleCheckout` | Registro de checkout/devolução de veículos |
| `AuditLog` | Log de auditoria (append-only) |
| `RefreshToken` | Tokens de refresh (httpOnly cookie) |

### Dev → Prod

- **Desenvolvimento**: SQLite (arquivo local, zero config)
- **Produção**: PostgreSQL (mudar `provider` e `DATABASE_URL` no `schema.prisma` e `.env`)
- Não há migrations versionadas; usa `prisma db push` para sync rápido. Para prod com migrações controladas, use `prisma migrate dev` / `prisma migrate deploy`.

---

## 👥 Roles e Permissões

| Role | Descrição | Acesso |
|------|-----------|--------|
| `SUPER_ADMIN` | Administrador total | Tudo + gestão de admins |
| `MANAGER` | Gerente operacional | Viagens, veículos, motoristas, relatórios |
| `DRIVER` | Motorista | Próprio perfil, viagens atribuídas |
| `PASSENGER` | Passageiro | Próprio perfil, solicitar viagens |

O middleware de autenticação (`src/lib/auth-middleware.ts`) extrai o JWT do header `Authorization: Bearer <token>` e disponibiliza o usuário no request.

---

## ⚙️ Máquinas de Estado

### Veículo (5 estados)
```
AVAILABLE ──→ EN_ROUTE ──→ IN_RIDE ──→ AVAILABLE
    │                              ↑
    └──→ OFFLINE ←─────────────────┘
    └──→ MAINTENANCE ←────────────┘
```

### Viagem (6 estados)
```
REQUESTED ──→ DISPATCHED ──→ ARRIVED_AT_PICKUP ──→ IN_PROGRESS ──→ COMPLETED
    │                                                          ↑
    └──────────────────────→ CANCELED ←────────────────────────┘
```

Transições inválidas são rejeitadas pela função `canTransition()` em `src/lib/state-machine.ts`.

---

## 🌐 API Routes

| Grupo | Endpoint | Método | Descrição |
|-------|----------|--------|-----------|
| **Auth** | `/api/auth/login` | POST | Login (retorna access + refresh token) |
| | `/api/auth/logout` | POST | Logout (revoga refresh token) |
| | `/api/auth/refresh` | POST | Renova access token via cookie httpOnly |
| | `/api/auth/me` | GET | Dados do usuário autenticado |
| **Users** | `/api/users` | GET/POST | Listar / criar usuários |
| | `/api/users/[id]` | GET/PUT/DELETE | Buscar / atualizar / deletar usuário |
| **Vehicles** | `/api/vehicles` | GET/POST | Listar / criar veículos |
| | `/api/vehicles/[id]` | GET/PUT/DELETE | Buscar / atualizar / deletar veículo |
| | `/api/vehicles/[id]/metadata` | GET/POST | Metadados do veículo |
| **Drivers** | `/api/drivers` | GET/POST | Listar / criar motoristas |
| | `/api/drivers/[id]` | GET/PUT/DELETE | Buscar / atualizar / deletar motorista |
| **Passengers** | `/api/passengers` | GET/POST | Listar / criar passageiros |
| | `/api/passengers/[id]` | GET/PUT/DELETE | Buscar / atualizar / deletar passageiro |
| **Cost Centers** | `/api/cost-centers` | GET/POST | Listar / criar centros de custo |
| | `/api/cost-centers/[id]` | GET/PUT/DELETE | Buscar / atualizar / deletar |
| | `/api/cost-centers/[id]/metadata` | GET/POST | Metadados do centro de custo |
| **Rides** | `/api/rides` | GET/POST | Listar / criar viagens |
| | `/api/rides/[id]` | GET/PUT/DELETE | Buscar / atualizar / deletar viagem |
| | `/api/rides/[id]/dispatch` | POST | Despachar viagem (atribuir motorista/veículo) |
| **Rules** | `/api/rules` | GET/POST | Listar / criar regras |
| | `/api/rules/[id]` | GET/PUT/DELETE | Buscar / atualizar / deletar regra |
| **Checkouts** | `/api/checkouts` | GET/POST | Listar / realizar checkout |
| | `/api/checkouts/[id]/return` | POST | Devolver veículo |
| **Reports** | `/api/reports/rides` | GET | Exportar viagens (xlsx/csv/json) |
| **Audit** | `/api/audit-logs` | GET | Consultar logs de auditoria |
| **System** | `/api/health` | GET | Health check |
| | `/api/metrics` | GET | Métricas do dashboard |

---

## 📍 Serviço de Rastreamento (WebSocket)

Serviço independente em `mini-services/tracking-service/`:

```bash
cd mini-services/tracking-service
npm install
npm start
```

- **Porta padrão**: 3003
- **Salas**: `dashboard` (todos os movimentos), `ride-{rideId}` (viagem específica)
- **Eventos**:
  - `join-dashboard` - Entrar na sala geral
  - `join-ride` - Entrar na sala de uma viagem
  - `simulate-tracking` - Simular movimento de veículo
  - `vehicle-location` - Broadcast de posição atualizada

---

## 📊 Relatórios e Exportação

Acesse via `GET /api/reports/rides?format=xlsx&startDate=...&endDate=...`

| Formato | Header | Uso |
|---------|--------|-----|
| `xlsx` | `application/vnd.openxmlformats...` | Excel / Planilhas |
| `csv` | `text/csv` | Planilhas / Data pipelines |
| `json` | `application/json` | Integrações / APIs |

---

## 🚢 Deploy

### Vercel (Recomendado)

1. Faça push do código para o GitHub
2. Importe o repositório no [Vercel Dashboard](https://vercel.com/new)
3. Configure as variáveis de ambiente:
   - `DATABASE_URL` → URL do PostgreSQL de produção
   - `JWT_SECRET` → Secret forte (32+ caracteres)
   - `JWT_REFRESH_SECRET` → Secret forte diferente
4. Deploy automático

> O `vercel.json` já está configurado com `prisma generate` + `prisma db push` no build.

### Docker (alternativa)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### Outros

Qualquer plataforma que suporte Node.js 18+ com build command customizável funciona. Apenas garanta que `prisma generate` e `prisma db push` (ou `prisma migrate deploy`) rodem antes do `next build`.

---

## 🔄 Mudança de Stack

O sistema foi construído com camadas bem separadas, facilitando a troca de qualquer componente. Abaixo o guia para cada substituição possível:

### Banco de Dados: SQLite → PostgreSQL / MySQL

Já é suportado nativamente pelo Prisma. Basta:

1. No `prisma/schema.prisma`, mudar:
```prisma
datasource db {
  provider = "postgresql"  // ou "mysql"
  url      = env("DATABASE_URL")
}
```
2. Atualizar `DATABASE_URL` no `.env`
3. Rodar `npx prisma db push` ou criar migrations

Para **MySQL**, note que `@default(cuid())` funciona, mas se preferir UUIDs nativos, troque para `@default(uuid())` e ajuste o tipo para `String @db.Uuid`.

### Framework: Next.js → Outro

A lógica de negócio está toda nos **API routes** (`src/app/api/`) e **libs** (`src/lib/`), independentes do framework. Para migrar:

- **Express/Fastify/Hono**: Copie as lógica dos route handlers para seus controllers. Os imports de `NextRequest`/`NextResponse` viram `Request`/`Response` padrão. O `auth-middleware.ts` funciona com qualquer objeto Request.
- **Frontend separado (React/Vue/Svelte)**: A API é RESTful pura — qualquer cliente HTTP pode consumir. O `src/lib/api.ts` pode ser adaptado para `axios` ou `fetch` nativo.

### ORM: Prisma → Drizzle / TypeORM / Kysely

O schema define 12 modelos com relações claras. Para migrar:

1. **Drizzle**: Use o [Drizzle Kit](https://orm.drizzle.team/) para gerar o schema equivalente. As queries nos API routes precisam ser reescritas (sintaxe diferente).
2. **TypeORM**: Os decorators `@Entity`, `@Column`, `@Relation` mapeiam diretamente dos modelos Prisma.
3. **Kysely**: Esquema tipado via `KyselyTypegen` — bom para queries SQL puras.

> O maior esforço está nos API routes que usam `prisma.<model>.findMany()` etc. — são ~26 arquivos de route.

### Autenticação: JWT → NextAuth / Auth.js / Clerk / Lucia

O auth atual é custom JWT com access + refresh tokens em `src/lib/auth.ts` e `src/lib/auth-middleware.ts`. Para trocar:

- **NextAuth/Auth.js**: Configure providers (Credentials, Google, etc.) no `src/app/api/auth/[...nextauth]/route.ts`. Remova `auth.ts` e ajuste o middleware.
- **Clerk**: Adicione `<ClerkProvider>` no layout. Troque `apiFetch` para usar o token do Clerk.
- **Lucia**: Muito similar ao JWT custom — transição mais simples.

> O `auth-store.ts` (Zustand) permanece o mesmo — só muda de onde o token/user vêm.

### UI: shadcn/ui → Outra lib

Os componentes shadcn estão em `src/components/ui/`. O dashboard (`dashboard-shell.tsx`) importa desses componentes. Para trocar:

- **Material UI / Ant Design / Chakra**: Substitua os imports dos componentes UI. A lógica do dashboard (estados, useEffect, apiFetch) permanece.
- **Tailwind → CSS Modules / Styled Components**: Remova as classes Tailwind e use o sistema da nova lib. Os componentes shadcn podem ser substituídos um a um.

### Estado Global: Zustand → Redux / Jotai / Context API

O store atual (`src/stores/auth-store.ts`) tem ~37 linhas com `login`, `logout`, `setUser`. Fácil de migrar para qualquer gerenciador de estado.

### Rastreamento: Socket.io → Pusher / Ably / Firebase

O serviço em `mini-services/tracking-service/` é independente. Para trocar:

- **Pusher/Ably**: Substitua o server Socket.io pelo SDK do provedor. No cliente, troque `socket.io-client` pelo SDK correspondente.
- **Firebase Realtime DB**: Use `onValue()` listeners no lugar de `socket.on()`.

### Exportação: SheetJS → outra lib

A lógica de exportação está isolada em `/api/reports/rides/route.ts`. SheetJS (xlsx) pode ser trocado por `exceljs` ou `csv-writer` com mudanças mínimas.

### Resumo de Esforço de Migração

| Componente | Esforço | Arquivos afetados |
|-----------|---------|-------------------|
| Banco (Prisma nativo) | ⭐ Baixo | `schema.prisma`, `.env` |
| Estado (Zustand) | ⭐ Baixo | `auth-store.ts` |
| Auth (JWT) | ⭐⭐ Médio | `auth.ts`, `auth-middleware.ts`, `login-form.tsx` |
| UI (shadcn) | ⭐⭐ Médio | `components/ui/*`, `dashboard-shell.tsx` |
| Rastreamento | ⭐⭐ Médio | `tracking-service/*`, `dashboard-shell.tsx` |
| ORM (Prisma) | ⭐⭐⭐ Alto | Todos os 26 API routes |
| Framework (Next.js) | ⭐⭐⭐ Alto | Toda a estrutura `src/app/` |

---

## 📄 Licença

Projeto privado. Todos os direitos reservados.

---

<p align="center">
  Feito com 💛 para <strong>Super Aplicativos</strong>
</p>
