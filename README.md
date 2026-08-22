# 🚗 FleetControl — Ride Hailing Corporativo

<p align="center">
  <strong>Sistema completo de gestão de frota e transporte corporativo</strong><br>
  Painel administrativo · Rastreamento em tempo real · RBAC · Geofencing · Máquinas de Estado · Relatórios
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/License-Private-red" alt="License">
</p>

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Funcionalidades](#-funcionalidades)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Database — Modelos e Relações](#-database--modelos-e-relações)
- [Roles e Permissões (RBAC)](#-roles-e-permissões-rbac)
- [Autenticação JWT](#-autenticação-jwt)
- [Máquinas de Estado](#-máquinas-de-estado)
- [Geofencing](#-geofencing)
- [Auditoria](#-auditoria)
- [API Routes — Referência Completa](#-api-routes--referência-completa)
- [Serviço de Rastreamento (WebSocket)](#-serviço-de-rastreamento-websocket)
- [Relatórios e Exportação](#-relatórios-e-exportação)
- [Dashboard SPA](#-dashboard-spa)
- [Deploy](#-deploy)
- [Migração de Stack](#-migração-de-stack)
- [Segurança](#-segurança)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## 👁 Visão Geral

FleetControl é um sistema **fullstack** de ride hailing corporativo que gerencia toda a operação de transporte de uma empresa: desde o cadastro de motoristas e veículos até o despacho de viagens, rastreamento em tempo real e exportação de relatórios financeiros.

**Princípios de design:**

- **API-first**: Toda lógica de negócio vive nos API routes (`/api/*`). O frontend é um consumidor puro.
- **SPA com estado**: O dashboard inteiro é um single-page app com navegação por estado (sem rotas Next.js para páginas internas). Isso mantém a UX fluida sem reloads.
- **Audit trail imutável**: Toda mutação (POST/PUT/DELETE) gera um registro em `AuditLog` automaticamente.
- **State machines**: Transições de status de veículos e viagens são validadas por máquinas de estado — não é possível pular etapas.
- **Camadas separadas**: Libs, stores, types, components e API routes são independentes. Facilita migração de qualquer camada (ver [Migração de Stack](#-migração-de-stack)).

---

## 🛠 Tecnologias

| Camada | Tecnologia | Versão | Por quê? |
--------|-----------|--------|----------|
| Framework | **Next.js** (App Router) | 16.x | API routes nativas, SSR/SSG disponível, build otimizado |
| Linguagem | **TypeScript** | 5.x | Tipagem estática em todo o projeto |
| Estilização | **Tailwind CSS** | 4.x | Utility-first, zero runtime, design system consistente |
| UI Components | **shadcn/ui** (Radix UI) | latest | Componentes acessíveis, customizáveis, sem vendor lock-in |
| ORM | **Prisma** | 6.x | Type-safe queries, schema-first, migrations automáticas |
| Banco (dev) | **SQLite** | — | Zero config, arquivo local, perfeito para desenvolvimento |
| Banco (prod) | **PostgreSQL** | 15+ | Robusto, suporte a JSON, full-text search, escalável |
| Autenticação | **JWT** (custom) | — | Access token (15min) + Refresh token (7 dias, httpOnly cookie) |
| Hashing | **bcryptjs** | 3.x | Hashing de senhas com salt rounds |
| Estado Cliente | **Zustand** | 5.x | Leve, sem boilerplate, persistência em localStorage |
| Validação | **Zod** | 4.x | Validação de schemas (usado nos forms via react-hook-form) |
| Rastreamento | **Socket.io** | 4.x | WebSocket com rooms, fallback, reconexão automática |
| Exportação | **SheetJS (xlsx)** | 0.18.x | Geração de XLSX/CSV no servidor |
| Geofencing | **Haversine** (próprio) | — | Fórmula de distância entre coordenadas geográficas |
| IDs | **CUID** | — | IDs únicos, ordenáveis por tempo, gerados pelo Prisma |

---

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js App (Porta 3000)               │
│                                                             │
│  ┌──────────────────┐  ┌────────────────────────────────┐  │
│  │   Dashboard SPA   │  │      API Routes (/api/*)      │  │
│  │                   │  │                                │  │
│  │  · Zustand Store  │  │  auth/*     → JWT login/refresh│  │
│  │  · apiFetch()     │  │  users/*    → CRUD + RBAC     │  │
│  │  · React 19       │  │  vehicles/* → CRUD + metadata  │  │
│  │  · shadcn/ui      │  │  drivers/*  → CRUD + vínculo  │  │
│  │  · Tailwind 4     │  │  rides/*    → CRUD + despacho  │  │
│  │                   │  │  reports/*  → XLSX/CSV/JSON   │  │
│  │                   │  │  audit-logs → Consulta only    │  │
│  └────────┬──────────┘  └──────────┬─────────────────────┘  │
│           │                        │                        │
│           └──────────┬─────────────┘                        │
│                      ▼                                      │
│              ┌───────────────┐                              │
│              │   Prisma ORM  │                              │
│              │  (Type-safe)  │                              │
│              └───────┬───────┘                              │
│                      │                                      │
│         ┌────────────┴────────────┐                         │
│         ▼                         ▼                         │
│   SQLite (dev)            PostgreSQL (prod)                 │
│   file:./db/custom.db     postgresql://host:5432/db        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│  Tracking Service (Porta 3003)  │  ← Processo independente
│  Socket.io Server              │
│  · Salas: dashboard, ride-{id}  │
│  · Simulação de posição GPS     │
│  · Graceful shutdown            │
└─────────────────────────────┘
```

### Fluxo de Autenticação

```
Cliente                    API Route                  Database
  │                           │                          │
  │  POST /api/auth/login     │                          │
  │  {email, password}        │                          │
  │──────────────────────────>│                          │
  │                           │  findUser(email)         │
  │                           │─────────────────────────>│
  │                           │<─────────────────────────│
  │                           │  bcrypt.compare()         │
  │                           │                          │
  │                           │  createRefreshToken()    │
  │                           │─────────────────────────>│
  │                           │<─────────────────────────│
  │                           │                          │
│  {accessToken, user}        │                          │
│  Set-Cookie: refreshToken   │                          │
│<──────────────────────────│                          │
  │                           │                          │
  │  GET /api/rides           │                          │
  │  Authorization: Bearer    │                          │
│──────────────────────────>│                          │
  │                           │  verifyJWT()             │
  │  401? → auto-refresh      │  → query                 │
  │                           │─────────────────────────>│
│<──────────────────────────│                          │
```

### Fluxo de Despacho de Viagem

```
Manager solicita despacho
         │
         ▼
  Verifica: role ∈ {SUPER_ADMIN, MANAGER}
         │
         ▼
  Busca Ride (status deve ser REQUESTED)
         │
         ▼
  Busca Driver + Vehicle
         │
         ▼
  Verifica Vehicle.status === AVAILABLE
         │
         ▼
  Atualiza Ride: status→DISPATCHED, driverId, vehicleId
  Atualiza Vehicle: status→EN_ROUTE
  Registra AuditLog
         │
         ▼
  Retorna Ride completo com relações
```

---

## ✨ Funcionalidades

### Gestão de Usuários
- CRUD completo com busca por texto e paginação server-side
- 4 papéis: `SUPER_ADMIN`, `MANAGER`, `DRIVER`, `PASSENGER`
- Ativação/desativação de contas (soft delete via `isActive`)
- Rate limiting no login: **5 tentativas falhas / 15 minutos** (in-memory Map)
- Vinculação a filial (`branchId` / `branchName`) para hierarquia corporativa

### Gestão de Veículos
- Cadastro com placa (única), modelo, capacidade, cor, ano
- 5 status com máquina de estado: `AVAILABLE → EN_ROUTE → IN_RIDE → AVAILABLE` (e `OFFLINE`, `MAINTENANCE`)
- Metadados customizáveis (chave-valor) via `VehicleMetadata` — ex: `chassi`, `seguradora`, `IPVA vencimento`
- Relação 1:1 com motorista (`currentDriver`)

### Gestão de Motoristas
- Perfil de motorista vinculado a um `User` (1:1)
- Dados: CNH (`licenseNumber`), validade da CNH, telefone
- Status: `AVAILABLE`, `OFF_DUTY`, `IN_RIDE`
- Vínculo 1:1 com veículo (`currentVehicle`)

### Gestão de Passageiros
- Perfil de passageiro vinculado a um `User` (1:1)
- Telefone opcional
- Vinculação a `CostCenter` (centro de custo departamental)

### Centros de Custo
- Cadastro com nome, código (único), descrição
- Metadados customizáveis (chave-valor) — ex: `orçamento mensal`, `gestor`
- Controla quais passageiros pertencem a qual departamento

### Viagens (Rides)
- Ciclo completo de 6 estados: `REQUESTED → DISPATCHED → ARRIVED_AT_PICKUP → IN_PROGRESS → COMPLETED/CANCELED`
- Dados de origem e destino com endereço + coordenadas (lat/lng)
- Timestamps em cada etapa: `requestedAt`, `dispatchedAt`, `arrivedAt`, `startedAt`, `completedAt`, `canceledAt`
- Despacho manual pelo Manager/SuperAdmin (atribui motorista + veículo)
- Validação de geofencing na criação (se houver regras ativas)

### Regras de Disponibilidade (Geofencing)
- Configuração por centro de custo / global
- **Raio máximo**: distância em km do centro permitido (fórmula de Haversine)
- **Horário**: janela de horário permitida (HH:mm), suporta overnight (ex: 22:00–06:00)
- **Dias da semana**: lista de dias permitidos (0=Dom, 1=Seg, ..., 6=Sáb)
- Validação automática ao criar viagem

### Checkout/Devolução de Veículos
- Registro de saída e devolução de veículos por motorista
- Controle de quilometragem (hodômetro saída/entrada)
- Nível de combustível
- Status: `ACTIVE` (veículo com motorista) → `RETURNED` (devolvido)

### Relatórios
- Exportação de viagens em **XLSX** (Excel), **CSV** e **JSON**
- Filtros: período (`dateFrom`/`dateFrom`), status, centro de custo
- Campos exportados: ID, passageiro, motorista, veículo, centro de custo, status, endereços, timestamps, notas
- Gerado server-side via SheetJS (`/api/reports/rides`)

### Rastreamento em Tempo Real (WebSocket)
- Serviço independente em `mini-services/tracking-service/`
- Socket.io com salas: `dashboard` (toda a frota) e `ride-{rideId}` (viagem específica)
- Eventos: `join-dashboard`, `join-ride`, `leave-ride`, `leave-dashboard`, `simulate-tracking`, `stop-tracking`, `vehicle-location`
- Simulação de posição GPS com movimentação aleatória (para testes)
- Graceful shutdown (SIGTERM/SIGINT)

### Auditoria
- Log automático e append-only de **todas** as mutações (POST/PUT/DELETE)
- Registro de: userId, action (HTTP method), resource, resourceId, details (JSON), ipAddress, userAgent
- Consulta com paginação e filtros por entidade (resource)

### Dashboard (Visão Geral)
- Cards de métricas: total de usuários, veículos disponíveis, motoristas, viagens hoje, viagens ativas
- Acesso rápido por página com busca e paginação

---

## 📁 Estrutura do Projeto

```
Ride-Hailing-Corporativo/
├── prisma/
│   ├── schema.prisma              # 12 modelos, relações, índices
│   ├── seed.ts                    # Dados iniciais de desenvolvimento
│   └── db/                        # SQLite local (gitignored)
├── src/
│   ├── app/
│   │   ├── page.tsx                # Raiz → renderiza <DashboardShell />
│   │   ├── layout.tsx              # Layout global (fontes, metadata, Toaster)
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts       # POST - Login + refresh token cookie
│   │   │   │   ├── logout/route.ts      # POST - Revoga refresh token
│   │   │   │   ├── refresh/route.ts     # POST - Renova access token
│   │   │   │   └── me/route.ts          # GET  - Dados do user autenticado
│   │   │   ├── users/
│   │   │   │   ├── route.ts             # GET (list) / POST (create)
│   │   │   │   └── [id]/route.ts        # GET / PUT / DELETE
│   │   │   ├── vehicles/
│   │   │   │   ├── route.ts             # GET / POST
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts         # GET / PUT / DELETE
│   │   │   │       └── metadata/route.ts # GET / POST
│   │   │   ├── drivers/
│   │   │   │   ├── route.ts             # GET / POST
│   │   │   │   └── [id]/route.ts        # GET / PUT / DELETE
│   │   │   ├── passengers/
│   │   │   │   ├── route.ts             # GET / POST
│   │   │   │   └── [id]/route.ts        # GET / PUT / DELETE
│   │   │   ├── cost-centers/
│   │   │   │   ├── route.ts             # GET / POST
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts         # GET / PUT / DELETE
│   │   │   │       └── metadata/route.ts # GET / POST
│   │   │   ├── rides/
│   │   │   │   ├── route.ts             # GET / POST
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts         # GET / PUT / DELETE
│   │   │   │       └── dispatch/route.ts # POST - Despacho de viagem
│   │   │   ├── rules/
│   │   │   │   ├── route.ts             # GET / POST
│   │   │   │   └── [id]/route.ts        # GET / PUT / DELETE
│   │   │   ├── checkouts/
│   │   │   │   ├── route.ts             # GET / POST (checkout)
│   │   │   │   └── [id]/
│   │   │   │       └── return/route.ts  # POST (devolução)
│   │   │   ├── reports/
│   │   │   │   └── rides/route.ts       # GET - Export XLSX/CSV/JSON
│   │   │   ├── audit-logs/
│   │   │   │   └── route.ts             # GET - Consulta paginada
│   │   │   ├── health/route.ts          # GET - Health check
│   │   │   ├── metrics/route.ts         # GET - Métricas do dashboard
│   │   │   └── route.ts                 # GET - Redirect raiz da API
│   │   └── globals.css                 # Tailwind directives
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── dashboard-shell.tsx      # SPA completo (~1120 linhas)
│   │   │   │                            # Sidebar + Topbar + 10 páginas
│   │   │   │                            # CrudTable<T> genérico
│   │   │   │                            # Pagination, Modais, Forms
│   │   │   └── login-form.tsx           # Formulário de login
│   │   └── ui/                          # ~30 componentes shadcn/ui
│   │       ├── button.tsx, input.tsx, card.tsx, dialog.tsx
│   │       ├── select.tsx, table.tsx, badge.tsx, tabs.tsx
│   │       ├── dropdown-menu.tsx, sidebar.tsx, tooltip.tsx
│   │       └── ... (mais 20+ componentes)
│   ├── lib/
│   │   ├── auth.ts                    # JWT, bcrypt, rate limiting
│   │   ├── auth-middleware.ts          # getRequestUser(), requireRole(), AuthError
│   │   ├── audit.ts                    # auditLog() — grava no banco
│   │   ├── state-machine.ts            # VEHICLE_TRANSITIONS, RIDE_TRANSITIONS, canTransition()
│   │   ├── geofencing.ts               # Haversine, validação temporal, validateRideRequest()
│   │   ├── api.ts                      # apiFetch() client, helpers (formatDate, formatStatus, etc)
│   │   ├── db.ts                       # Instância singleton do PrismaClient
│   │   └── utils.ts                    # cn() (clsx + tailwind-merge)
│   ├── stores/
│   │   └── auth-store.ts              # Zustand store (login, logout, setUser)
│   ├── hooks/
│   │   ├── use-mobile.ts              # Detecta viewport mobile
│   │   └── use-toast.ts               # Toast notifications
│   └── types/
│       └── index.ts                    # Interfaces, consts (ROLES, VEHICLE_STATUS, RIDE_STATUS)
├── mini-services/
│   └── tracking-service/
│       ├── index.ts                    # Socket.io server (porta 3003)
│       ├── package.json                # Dependências do serviço
│       └── tsconfig.json               # Config TypeScript do serviço
├── vercel.json                         # Configuração de deploy (Vercel)
├── .env.example                        # Template de variáveis de ambiente
├── .gitignore                          # Arquivos ignorados
├── package.json                        # Dependências e scripts
├── tsconfig.json                       # Config TypeScript
├── next.config.ts                      # Config Next.js
├── tailwind.config.ts                  # Config Tailwind CSS 4
├── MIGRATION-GUIDE.md                  # Guia completo de migração de stack
└── README.md                           # Este arquivo
```

---

## 🚀 Instalação e Configuração

### Pré-requisitos

| Ferramenta | Versão mínima | Verificação |
-----------|---------------|-------------|
| Node.js | 18.17+ | `node -v` |
| npm | 9+ | `npm -v` |
| Git | 2.x | `git --version` |

> **Alternativa**: `bun` funciona no lugar do npm em todos os comandos.

### Setup Local (5 passos)

```bash
# 1. Clone o repositório
git clone https://github.com/superaplicativos/Ride-Hailing-Corporativo.git
cd Ride-Hailing-Corporativo

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# O .env padrão usa SQLite local — funciona sem nenhuma mudança

# 4. Gere o Prisma Client e crie o banco de dados
npx prisma generate
npx prisma db push

# 5. (Opcional) Popule com dados de teste
npx tsx prisma/seed.ts

# 6. Rode o servidor de desenvolvimento
npm run dev
```

Abra **http://localhost:3000** no navegador.

### Credenciais de Seed

| Papel | Email | Senha |
-------|-------|-------|
| Super Administrador | `admin@corporate.com` | `Admin@123` |
| Gerente | `manager@corporate.com` | `Manager@123` |
| Motorista | `driver1@corporate.com` | `Driver@123` |
| Passageiro | `passenger1@corporate.com` | `Passenger@123` |

> O seed cria 6 users, 3 veículos, 2 motoristas, 2 passageiros, 2 centros de custo, 1 regra de disponibilidade e 1 viagem concluída.

### Tracking Service (opcional)

```bash
cd mini-services/tracking-service
npm install
npm run dev    # ou: bun --hot index.ts
```

O serviço roda na porta **3003**.

---

## 🔑 Variáveis de Ambiente

| Variável | Descrição | Valor Dev (padrão) | Valor Produção |
----------|-----------|--------------------|--------------------| `DATABASE_URL` | URL de conexão com o banco | `file:./db/custom.db` | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | Chave secreta para access tokens (mínimo 32 chars em prod) | hardcoded (funciona em dev) | **Gerar secret forte** |
| `JWT_REFRESH_SECRET` | Chave secreta para refresh tokens | hardcoded (funciona em dev) | **Gerar secret forte** |
| `TRACKING_WS_PORT` | Porta do serviço de rastreamento | `3003` | `3003` ou outra disponível |

> ⚠️ **PRODUÇÃO**: Sempre gere secrets fortes (32+ caracteres) para os JWT e use PostgreSQL com SSL.
> ```bash
> # Gerar secrets fortes:
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 📜 Scripts Disponíveis

| Script | Comando | Descrição |
--------|---------|-----------|
| `dev` | `npm run dev` | Servidor de desenvolvimento (porta 3000, hot reload) |
| `build` | `npm run build` | Build de produção (standalone + static files) |
| `start` | `npm run start` | Servidor de produção (porta 3000) |
| `lint` | `npm run lint` | ESLint em todos os arquivos |
| `db:push` | `npm run db:push` | Sync do schema Prisma sem migrations |
| `db:generate` | `npm run db:generate` | Gerar Prisma Client |
| `db:migrate` | `npm run db:migrate` | Criar e aplicar migrations versionadas |
| `db:reset` | `npm run db:reset` | Resetar banco + rodar seed |

---

## 🗄 Database — Modelos e Relações

### Diagrama ER (simplificado)

```
User (1) ──→ (0..1) Driver ──→ (0..1) Vehicle
User (1) ──→ (0..1) Passenger ──→ (0..1) CostCenter
Vehicle (1) ──→ (0..*) VehicleMetadata
CostCenter (1) ──→ (0..*) CostCenterMetadata
Driver (1) ──→ (0..*) VehicleCheckout ←── (1) Vehicle
Driver (1) ──→ (0..*) Ride
Passenger (1) ──→ (0..*) Ride
Vehicle (1) ──→ (0..*) Ride
CostCenter (1) ──→ (0..*) Ride
User (1) ──→ (0..*) AuditLog
User (1) ──→ (0..*) RefreshToken
```

### Todos os 12 Modelos

| Modelo | Descrição | Campos principais | Relações |
--------|-----------|-------------------|----------|
| **User** | Usuários do sistema | `email` (unique), `name`, `passwordHash`, `role`, `branchId`, `isActive` | → Driver, Passenger, AuditLog[], RefreshToken[] |
| **Vehicle** | Veículos da frota | `plate` (unique), `model`, `capacity`, `status`, `color`, `year`, `trackerId` | → currentDriver, VehicleMetadata[], Ride[], VehicleCheckout[] |
| **VehicleMetadata** | Metadados customizáveis | `key`, `value` | ← Vehicle (cascade delete) |
| **Driver** | Perfil de motorista | `licenseNumber`, `licenseExpiry`, `phone`, `status`, `currentVehicleId` (unique) | ← User, → currentVehicle, Ride[], VehicleCheckout[] |
| **Passenger** | Perfil de passageiro | `phone`, `costCenterId` | ← User, → CostCenter, Ride[] |
| **CostCenter** | Centro de custo | `name`, `code` (unique), `description`, `isActive` | → Passenger[], Ride[], CostCenterMetadata[] |
| **CostCenterMetadata** | Metadados do CC | `key`, `value` | ← CostCenter (cascade delete) |
| **AvailabilityRule** | Regras de geofencing | `centerLat`, `centerLng`, `radiusKm`, `allowedDays`, `startTime`, `endTime` | Sem relações (validação em código) |
| **Ride** | Viagens | `status`, `pickupAddress/Lat/Lng`, `dropoffAddress/Lat/Lng`, timestamps (6), `cancelReason`, `notes` | ← Passenger, Driver?, Vehicle?, CostCenter? |
| **VehicleCheckout** | Check-out de veículos | `checkedOutAt`, `checkedInAt`, `mileageOut/In`, `fuelLevelOut/In`, `status` | ← Vehicle, ← Driver |
| **AuditLog** | Log de auditoria | `userId`, `action`, `resource`, `resourceId`, `details` (JSON), `ipAddress`, `userAgent` | ← User? |
| **RefreshToken** | Tokens de refresh | `token` (unique), `expiresAt` | ← User (cascade delete) |

### Enums (via String)

Prisma com SQLite não suporta enums nativas. Usamos `String` com valores documentados:

- **Roles**: `SUPER_ADMIN`, `MANAGER`, `DRIVER`, `PASSENGER`
- **Vehicle Status**: `AVAILABLE`, `EN_ROUTE`, `IN_RIDE`, `OFFLINE`, `MAINTENANCE`
- **Ride Status**: `REQUESTED`, `DISPATCHED`, `ARRIVED_AT_PICKUP`, `IN_PROGRESS`, `COMPLETED`, `CANCELED`
- **Driver Status**: `AVAILABLE`, `OFF_DUTY`, `IN_RIDE`
- **Checkout Status**: `ACTIVE`, `RETURNED`

> Ao migrar para PostgreSQL, considere usar `enum` nativos do Prisma.

### Dev ↔ Produção

| Aspecto | Desenvolvimento | Produção |
---------|----------------|----------|
| Provider | `sqlite` | `postgresql` |
| URL | `file:./db/custom.db` | `postgresql://...` |
| Migrations | `prisma db push` (sem versionamento) | `prisma migrate deploy` (versionado) |
| SSL | N/A | Obrigatório |
| Connection Pooling | N/A | Recomendado (PgBouncer/Supabase pooler) |

---

## 👥 Roles e Permissões (RBAC)

| Role | Descrição | Acesso |
------|-----------|--------|
| `SUPER_ADMIN` | Administrador total do sistema | Tudo: CRUD de todos os recursos, despacho, relatórios, auditoria, gestão de admins |
| `MANAGER` | Gerente operacional de filial | CRUD de viagens, veículos, motoristas, passageiros, relatórios, despacho. **Sem** gestão de outros admins/managers |
| `DRIVER` | Motorista | Apenas próprio perfil. Viagens atribuídas (leitura). Checkout/devolução |
| `PASSENGER` | Passageiro | Apenas próprio perfil. Solicitar viagens. Histórico próprio |

### Implementação

O middleware de autenticação (`src/lib/auth-middleware.ts`) fornece duas funções:

```typescript
import { getRequestUser, requireRole, AuthError } from '@/lib/auth-middleware'
import { ROLES } from '@/types'

// Extrai user do JWT (dispara AuthError se inválido)
const user = getRequestUser(request)

// Verifica permissão (dispara AuthError se não tem role)
requireRole([ROLES.SUPER_ADMIN, ROLES.MANAGER])(user)
```

Cada API route que precisa de autenticação usa esse pattern. O `requireRole` retorna uma função que é chamada com o user — se o role não estiver na lista, lança `AuthError` com status 403.

---

## 🔐 Autenticação JWT

### Access Token
- **Payload**: `sub` (userId), `email`, `name`, `role`, `branchId`, `branchName`
- **Expiry**: 15 minutos
- **Envio**: Header `Authorization: Bearer <token>`
- **Geração**: `jsonwebtoken.sign()` com `JWT_SECRET`

### Refresh Token
- **Formato**: UUID v4
- **Expiry**: 7 dias
- **Armazenamento**: Banco de dados (modelo `RefreshToken`) + cookie httpOnly
- **Cookie config**: `httpOnly: true`, `secure: true` (em prod), `sameSite: 'lax'`, `path: '/'`

### Fluxo de Refresh

```
1. Request com access token expirado → API retorna 401
2. Cliente chama POST /api/auth/refresh (com cookie httpOnly)
3. Server valida refresh token no banco + expiry
4. Gera novo access token
5. Revoga refresh token antigo (security best practice)
6. Retorna novo access token
```

### Rate Limiting

- Implementado em memória (Map) em `src/lib/auth.ts`
- **5 tentativas falhas** por email dentro de **15 minutos**
- Limpa ao logar com sucesso
- Em produção, considere usar Redis para rate limiting distribuído

---

## ⚙️ Máquinas de Estado

Definidas em `src/lib/state-machine.ts` usando `Map<string, string[]>`.

### Veículo (5 estados)

```
                    ┌──────────────┐
                    │   AVAILABLE  │◄──────────────────────────┐
                    └──────┬───────┘                           │
                           │                                   │
              ┌────────────┼────────────┐                    │
              ▼            ▼            ▼                    │
       ┌──────────┐  ┌──────────┐  ┌──────────────┐         │
       │ EN_ROUTE │  │ OFFLINE  │  │ MAINTENANCE  │         │
       └────┬─────┘  └────┬─────┘  └──────┬───────┘         │
            │             │               │                  │
            ▼             │               │                  │
       ┌──────────┐      │               │                  │
       │  IN_RIDE │──────┴───────────────┴──────────────────┘
       └──────────┘
```

| Estado Atual | Transições Possíveis |
-------------|---------------------|
| `AVAILABLE` | → `EN_ROUTE`, `OFFLINE`, `MAINTENANCE` |
| `EN_ROUTE` | → `IN_RIDE`, `AVAILABLE` |
| `IN_RIDE` | → `AVAILABLE` |
| `OFFLINE` | → `AVAILABLE` |
| `MAINTENANCE` | → `AVAILABLE` |

### Viagem (6 estados)

```
  REQUESTED ──→ DISPATCHED ──→ ARRIVED_AT_PICKUP ──→ IN_PROGRESS ──→ COMPLETED
      │              │                │                     │
      └──────────────┴────────────────┴─────────────────────┘
                                  │
                                  ▼
                             CANCELED
```

| Estado Atual | Transições Possíveis |
-------------|---------------------|
| `REQUESTED` | → `DISPATCHED`, `CANCELED` |
| `DISPATCHED` | → `ARRIVED_AT_PICKUP`, `CANCELED` |
| `ARRIVED_AT_PICKUP` | → `IN_PROGRESS`, `CANCELED` |
| `IN_PROGRESS` | → `COMPLETED`, `CANCELED` |
| `COMPLETED` | — (estado final) |
| `CANCELED` | — (estado final) |

> Qualquer transição não listada acima é **rejeitada** pela função `canTransition()`.

---

## 📍 Geofencing

Implementado em `src/lib/geofencing.ts`.

### Fórmula de Haversine

Calcula a distância em km entre duas coordenadas geográficas (lat/lng) usando a fórmula de Haversine com raio terrestre de 6.371 km.

```typescript
isWithinRadius(lat1, lng1, lat2, lng2, radiusKm): boolean
```

### Validação Temporal

- **Horário**: `isWithinAllowedTime('08:00', '18:00')` — suporta janelas overnight (ex: `22:00`–`06:00`)
- **Dia da semana**: `isAllowedDay('1,2,3,4,5')` — dias como números (0=Dom, 6=Sáb), separados por vírgula

### Validação Completa

```typescript
validateRideRequest(pickupLat, pickupLng, rules[]): { valid: boolean; reason?: string }
```

Verifica **todas** as regras ativas na ordem: dia → horário → raio geográfico. Retorna `{ valid: false, reason }` na primeira regra que falhar, ou `{ valid: true }` se todas passarem.

---

## 📝 Auditoria

Implementada em `src/lib/audit.ts`.

```typescript
auditLog({
  userId: user.sub,
  action: 'POST',        // HTTP method
  resource: 'rides',     // Nome da entidade
  resourceId: rideId,    // ID do registro
  details: { ... },      // Dados da mutação (serializado como JSON)
  request,               // NextRequest (para extrair IP e User-Agent)
})
```

- **Append-only**: Não há update ou delete nos logs de auditoria
- **Campos automáticos**: `ipAddress` (via `x-forwarded-for` ou `x-real-ip`), `userAgent`
- **Consultável**: Via `GET /api/audit-logs` com paginação e filtro por `resource`

---

## 🌐 API Routes — Referência Completa

### Padrão de Resposta

```jsonc
// Sucesso
{ "success": true, "data": { ... } }

// Lista paginada
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }

// Erro
{ "success": false, "error": "Mensagem descritiva" }
```

### Autenticação

| Endpoint | Método | Auth | Descrição |
----------|--------|------|-----------|
| `/api/auth/login` | POST | ❌ | Login. Body: `{email, password}`. Retorna access token + seta cookie refresh |
| `/api/auth/logout` | POST | ✅ | Logout. Revoga refresh token do banco |
| `/api/auth/refresh` | POST | ❌ (usa cookie) | Renova access token. Consome cookie httpOnly |
| `/api/auth/me` | GET | ✅ | Retorna dados do usuário autenticado |

### Usuários

| Endpoint | Método | Roles | Descrição |
----------|--------|-------|-----------|
| `/api/users` | GET | SUPER_ADMIN, MANAGER | Lista paginada. Query: `?page=&limit=&search=&role=` |
| `/api/users` | POST | SUPER_ADMIN | Cria usuário. Body: `{email, name, password, role, branchId, branchName}` |
| `/api/users/[id]` | GET | SUPER_ADMIN, MANAGER | Detalhes do usuário |
| `/api/users/[id]` | PUT | SUPER_ADMIN | Atualiza usuário |
| `/api/users/[id]` | DELETE | SUPER_ADMIN | Desativa usuário (soft delete via `isActive=false`) |

### Veículos

| Endpoint | Método | Roles | Descrição |
----------|--------|-------|-----------|
| `/api/vehicles` | GET | SUPER_ADMIN, MANAGER | Lista paginada. Query: `?page=&limit=&search=&status=` |
| `/api/vehicles` | POST | SUPER_ADMIN, MANAGER | Cria veículo. Body: `{plate, model, capacity, color, year, trackerId}` |
| `/api/vehicles/[id]` | GET | Todos autenticados | Detalhes do veículo |
| `/api/vehicles/[id]` | PUT | SUPER_ADMIN, MANAGER | Atualiza veículo |
| `/api/vehicles/[id]` | DELETE | SUPER_ADMIN, MANAGER | Remove veículo |
| `/api/vehicles/[id]/metadata` | GET | SUPER_ADMIN, MANAGER | Lista metadados do veículo |
| `/api/vehicles/[id]/metadata` | POST | SUPER_ADMIN, MANAGER | Adiciona metadado. Body: `{key, value}` |

### Motoristas

| Endpoint | Método | Roles | Descrição |
----------|--------|-------|-----------|
| `/api/drivers` | GET | SUPER_ADMIN, MANAGER | Lista paginada com include de user e vehicle |
| `/api/drivers` | POST | SUPER_ADMIN, MANAGER | Cria motorista. Body: `{userId, licenseNumber, licenseExpiry, phone, currentVehicleId}` |
| `/api/drivers/[id]` | GET | Todos autenticados | Detalhes com relações |
| `/api/drivers/[id]` | PUT | SUPER_ADMIN, MANAGER | Atualiza motorista |
| `/api/drivers/[id]` | DELETE | SUPER_ADMIN, MANAGER | Remove motorista |

### Passageiros

| Endpoint | Método | Roles | Descrição |
----------|--------|-------|-----------|
| `/api/passengers` | GET | SUPER_ADMIN, MANAGER | Lista paginada com include de user e costCenter |
| `/api/passengers` | POST | SUPER_ADMIN, MANAGER | Cria passageiro. Body: `{userId, phone, costCenterId}` |
| `/api/passengers/[id]` | GET | Todos autenticados | Detalhes com relações |
| `/api/passengers/[id]` | PUT | SUPER_ADMIN, MANAGER | Atualiza passageiro |
| `/api/passengers/[id]` | DELETE | SUPER_ADMIN, MANAGER | Remove passageiro |

### Centros de Custo

| Endpoint | Método | Roles | Descrição |
----------|--------|-------|-----------|
| `/api/cost-centers` | GET | SUPER_ADMIN, MANAGER | Lista paginada |
| `/api/cost-centers` | POST | SUPER_ADMIN, MANAGER | Cria CC. Body: `{name, code, description}` |
| `/api/cost-centers/[id]` | GET | Todos autenticados | Detalhes |
| `/api/cost-centers/[id]` | PUT | SUPER_ADMIN, MANAGER | Atualiza CC |
| `/api/cost-centers/[id]` | DELETE | SUPER_ADMIN, MANAGER | Remove CC |
| `/api/cost-centers/[id]/metadata` | GET | SUPER_ADMIN, MANAGER | Lista metadados |
| `/api/cost-centers/[id]/metadata` | POST | SUPER_ADMIN, MANAGER | Adiciona metadado |

### Viagens

| Endpoint | Método | Roles | Descrição |
----------|--------|-------|-----------|
| `/api/rides` | GET | SUPER_ADMIN, MANAGER | Lista paginada. Query: `?page=&limit=&search=&status=&costCenterId=` |
| `/api/rides` | POST | SUPER_ADMIN, MANAGER, PASSENGER | Cria viagem. Valida geofencing |
| `/api/rides/[id]` | GET | Todos autenticados | Detalhes com todas as relações |
| `/api/rides/[id]` | PUT | SUPER_ADMIN, MANAGER | Atualiza viagem (muda status via state machine) |
| `/api/rides/[id]` | DELETE | SUPER_ADMIN | Remove viagem |
| `/api/rides/[id]/dispatch` | POST | SUPER_ADMIN, MANAGER | **Despacho**: atribui driver + vehicle. Muda ride→DISPATCHED, vehicle→EN_ROUTE |

### Regras de Disponibilidade

| Endpoint | Método | Roles | Descrição |
----------|--------|-------|-----------|
| `/api/rules` | GET | SUPER_ADMIN, MANAGER | Lista todas as regras |
| `/api/rules` | POST | SUPER_ADMIN | Cria regra. Body: `{name, description, centerLat, centerLng, radiusKm, allowedDays, startTime, endTime}` |
| `/api/rules/[id]` | GET | Todos autenticados | Detalhes |
| `/api/rules/[id]` | PUT | SUPER_ADMIN | Atualiza regra |
| `/api/rules/[id]` | DELETE | SUPER_ADMIN | Remove regra |

### Checkouts

| Endpoint | Método | Roles | Descrição |
----------|--------|-------|-----------|
| `/api/checkouts` | GET | SUPER_ADMIN, MANAGER | Lista checkouts. Query: `?status=&vehicleId=&driverId=` |
| `/api/checkouts` | POST | SUPER_ADMIN, MANAGER | Checkout. Body: `{vehicleId, driverId, mileageOut, fuelLevelOut, notes}` |
| `/api/checkouts/[id]/return` | POST | SUPER_ADMIN, MANAGER | Devolução. Body: `{mileageIn, fuelLevelIn}` |

### Relatórios

| Endpoint | Método | Roles | Descrição |
----------|--------|-------|-----------|
| `/api/reports/rides` | GET | SUPER_ADMIN, MANAGER | Exportação. Query: `?format=xlsx|csv|json&dateFrom=&dateTo=&status=&costCenterId=` |

### Auditoria

| Endpoint | Método | Roles | Descrição |
----------|--------|-------|-----------|
| `/api/audit-logs` | GET | SUPER_ADMIN, MANAGER | Lista paginada. Query: `?page=&limit=&resource=` |

### Sistema

| Endpoint | Método | Auth | Descrição |
----------|--------|------|-----------|
| `/api/health` | GET | ❌ | `{ status: 'ok', timestamp: '...' }` |
| `/api/metrics` | GET | ✅ | Métricas do dashboard (counts por status) |

---

## 📡 Serviço de Rastreamento (WebSocket)

Serviço independente em `mini-services/tracking-service/`.

### Setup

```bash
cd mini-services/tracking-service
npm install
npm run dev    # bun --hot index.ts
```

### Configuração

- **Porta padrão**: 3003 (hardcoded, configurável via `TRACKING_WS_PORT`)
- **CORS**: `origin: '*'` (restringir em produção)
- **Ping**: 60s timeout, 25s interval

### Salas (Rooms)

| Sala | Descrição |
|------|-----------|
| `dashboard` | Recebe atualizações de **todos** os veículos em movimento |
| `ride-{rideId}` | Recebe atualizações de um veículo específico durante uma viagem |

### Eventos

| Evento | Direção | Payload | Descrição |
--------|---------|---------|-----------|
| `join-dashboard` | Client → Server | — | Entra na sala geral |
| `leave-dashboard` | Client → Server | — | Sai da sala geral |
| `join-ride` | Client → Server | `{ rideId }` | Entra na sala de uma viagem |
| `leave-ride` | Client → Server | `{ rideId }` | Sai da sala da viagem |
| `simulate-tracking` | Client → Server | `{ vehicleId, rideId?, intervalMs? }` | Inicia simulação GPS |
| `stop-tracking` | Client → Server | `{ vehicleId }` | Para simulação |
| `vehicle-location` | Server → Client | `{ vehicleId, lat, lng, heading, timestamp, speed }` | Posição atualizada |

### Simulação

O evento `simulate-tracking` inicia um loop que emite posições aleatórias a cada `intervalMs` (default: 2000ms), começando próximo ao centro de São Paulo (-23.5505, -46.6333). Velocidade simulada: 20–60 km/h.

---

## 📊 Relatórios e Exportação

Acesso via `GET /api/reports/rides`.

### Parâmetros de Query

| Parâmetro | Tipo | Descrição |
-----------|------|-----------|
| `format` | `xlsx` / `csv` / `json` | Formato de saída (default: `json`) |
| `dateFrom` | `YYYY-MM-DD` | Data inicial do filtro |
| `dateTo` | `YYYY-MM-DD` | Data final do filtro |
| `status` | String | Filtra por status da viagem |
| `costCenterId` | String | Filtra por centro de custo |

### Campos Exportados

Ride ID, Passenger, Driver, Vehicle (plate), Cost Center (code), Status, Pickup Address, Dropoff Address, Requested At, Dispatched At, Completed At, Canceled At, Notes.

### Content-Type

| Formato | Header |
---------|--------|
| XLSX | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| CSV | `text/csv` |
| JSON | `application/json` |

---

## 🖥 Dashboard SPA

O dashboard inteiro é um **Single Page Application** dentro de `src/components/dashboard/dashboard-shell.tsx`. Não usa rotas Next.js para navegação interna.

### Padrão de Navegação

```typescript
const [currentPage, setCurrentPage] = useState('overview')
// currentPage determina qual componente renderizar
```

### Páginas

| Página | `currentPage` | Descrição |
--------|--------------|-----------|
| Visão Geral | `overview` | Cards de métricas (counts por entidade e status) |
| Usuários | `users` | CRUD table com busca e paginação |
| Veículos | `vehicles` | CRUD table + status badges |
| Motoristas | `drivers` | CRUD table com vínculo veículo |
| Passageiros | `passengers` | CRUD table com vínculo centro de custo |
| Centros de Custo | `costCenters` | CRUD table + metadados |
| Viagens | `rides` | CRUD table + dialog de despacho + mudança de status |
| Regras | `rules` | CRUD table de geofencing |
| Checkouts | `checkouts` | Table + botão de devolução |
| Relatórios | `reports` | Filtros + botão de exportação |
| Auditoria | `audit` | Table de logs (leitura only) |

### Componente CrudTable\<T\>

Componente genérico reutilizado em todas as páginas de CRUD:

```typescript
<CrudTable<T>
  data={items}
  columns={columns}          // Definição das colunas
  searchPlaceholder="..."   // Texto do campo de busca
  onSearch={handleSearch}    // Callback de busca
  onCreate={handleCreate}    // Callback de criação (abre modal)
  onEdit={handleEdit}        // Callback de edição (abre modal)
  onDelete={handleDelete}    // Callback de exclusão (confirmação)
  loading={loading}
  pagination={pagination}
  onPageChange={setPage}
/>
```

### Padrão de Recarregamento

Usa `reloadKey` (counter de estado) para forçar re-fetch após mutações:

```typescript
const [reloadKey, setReloadKey] = useState(0)
// Após criar/editar/deletar:
setReloadKey(prev => prev + 1)
// useEffect com reloadKey na dependência dispara novo fetch
```

---

## 🚢 Deploy

### Vercel (Recomendado)

1. Push do código para GitHub
2. Importar repositório no [Vercel Dashboard](https://vercel.com/new)
3. Framework Preset: **Next.js** (auto-detectado)
4. Configurar variáveis de ambiente:
   - `DATABASE_URL` → URL do PostgreSQL de produção
   - `JWT_SECRET` → Secret forte (32+ chars)
   - `JWT_REFRESH_SECRET` → Secret forte diferente
5. Deploy automático a cada push em `main`

O `vercel.json` já está configurado:

```json
{
  "buildCommand": "npx prisma generate && npx prisma db push --accept-data-loss && next build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next/standalone"
}
```

### Docker

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

### Railway / Render / Fly.io

Qualquer plataforma PaaS com suporte a Node.js 18+ funciona. Apenas garanta que:

1. `prisma generate` rode antes do build
2. `prisma db push` (ou `prisma migrate deploy`) rode antes do start
3. Variáveis de ambiente estejam configuradas

---

## 🔄 Migração de Stack

O sistema foi construído com **camadas bem separadas** para facilitar a troca de qualquer componente sem reescrever tudo.

**Guia completo**: Veja o arquivo **[MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md)** para instruções detalhadas de migração de cada componente.

### Resumo de Esforço

| Componente | Esforço | Arquivos afetados |
-----------|---------|-------------------|
| Banco (Prisma nativo) | ⭐ Baixo | `schema.prisma`, `.env` |
| Estado (Zustand) | ⭐ Baixo | `auth-store.ts` |
| Auth (JWT custom) | ⭐⭐ Médio | `auth.ts`, `auth-middleware.ts`, `login-form.tsx` |
| UI (shadcn/ui) | ⭐⭐ Médio | `components/ui/*`, `dashboard-shell.tsx` |
| Rastreamento (Socket.io) | ⭐⭐ Médio | `tracking-service/*`, `dashboard-shell.tsx` |
| ORM (Prisma → outro) | ⭐⭐⭐ Alto | Todos os 26 API routes |
| Framework (Next.js → outro) | ⭐⭐⭐ Alto | Toda a estrutura `src/app/` |

---

## 🔒 Segurança

### Implementado
- ✅ Senhas hasheadas com bcrypt (10 salt rounds)
- ✅ JWT com expiry curto (15min) + refresh longo (7 dias)
- ✅ Refresh token em cookie httpOnly (não acessível via JS)
- ✅ Rate limiting no login (5 tentativas / 15min)
- ✅ RBAC com verificação por role em cada endpoint
- ✅ Audit trail completo em todas as mutações
- ✅ CORS configurado no tracking service

### Recomendações para Produção
- 🔲 Usar PostgreSQL com SSL
- 🔲 Gerar secrets fortes para JWT (32+ chars cada)
- 🔲 Mover rate limiting para Redis (distribuído)
- 🔲 Adicionar Helmet para headers de segurança
- 🔲 Implementar CSP (Content Security Policy)
- 🔲 Adicionar rate limiting global (ex: `express-rate-limit` ou middleware)
- 🔲 Restringir CORS no tracking service para domínio específico
- 🔲 Usar connection pooling (PgBouncer) para PostgreSQL
- 🔲 Implementar rotação de refresh tokens
- 🔲 Adicionar 2FA para SUPER_ADMIN

---

## 🤝 Contribuição

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: descrição da feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

### Convenções de Commit

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `refactor:` refatoração
- `style:` formatação
- `chore:` manutenção

---

## 📄 Licença

Projeto privado. Todos os direitos reservados.

---

<p align="center">
  Feito com 💛 para <strong>Super Aplicativos</strong>
</p>
