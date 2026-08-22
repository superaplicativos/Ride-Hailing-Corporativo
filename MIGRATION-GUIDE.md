# 🔄 Guia de Migração de Stack

> Instruções detalhadas para substituir qualquer componente do FleetControl sem reescrever o projeto inteiro.

---

## Sumário

- [Princípios de Arquitetura](#princípios-de-arquitetura)
- [Banco de Dados](#1-banco-de-dados)
- [ORM](#2-orm)
- [Framework Web](#3-framework-web)
- [Autenticação](#4-autenticação)
- [UI Components](#5-ui-components)
- [CSS / Estilização](#6-css--estilização)
- [Estado Global](#7-estado-global)
- [Rastreamento WebSocket](#8-rastreamento-websocket)
- [Exportação de Relatórios](#9-exportação-de-relatórios)
- [Validação de Forms](#10-validação-de-forms)
- [IDs / Strategy](#11-ids--strategy)
- [Matriz de Impacto Cruzado](#matriz-de-impacto-cruzado)

---

## Princípios de Arquitetura

O FleetControl segue o princípio de **separação de responsabilidades por camada**:

```
┌─────────────────────────────────────────────┐
│  Camada de Apresentação (UI)                │  ← Pode trocar independente
│  dashboard-shell.tsx + components/ui/*      │
├─────────────────────────────────────────────┤
│  Camada de Estado (Stores)                  │  ← Pode trocar independente
│  stores/auth-store.ts                       │
├─────────────────────────────────────────────┤
│  Camada de Comunicação (API Client)         │  ← Pode trocar independente
│  lib/api.ts                                 │
├─────────────────────────────────────────────┤
│  Camada de Negócio (API Routes + Libs)      │  ← Lógica central
│  api/**/*.ts + lib/auth.ts, lib/*.ts       │
├─────────────────────────────────────────────┤
│  Camada de Dados (ORM + DB)                 │  ← Pode trocar independente
│  prisma/schema.prisma + lib/db.ts          │
└─────────────────────────────────────────────┘
```

Cada camada se comunica com a adjacente por interfaces bem definidas (imports de funções/types). Trocar uma camada significa **reescrever apenas a interface de borda**, não o projeto inteiro.

---

## 1. Banco de Dados

### SQLite → PostgreSQL (suportado nativamente)

Já é a transição mais simples — Prisma suporta ambos sem mudar código de queries.

**Arquivos para alterar:**
- `prisma/schema.prisma`
- `.env`

**Passos:**

1. No `prisma/schema.prisma`, mude o datasource:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Atualize o `.env`:
```env
DATABASE_URL=postgresql://usuario:senha@host:5432/fleetcontrol?schema=public
```

3. Se quiser usar enums nativos do PostgreSQL:
```prisma
enum Role {
  SUPER_ADMIN
  MANAGER
  DRIVER
  PASSENGER
}

model User {
  role  Role  @default(PASSENGER)
  // ... resto igual
}
```
Isso exige migrar os dados existentes — use `prisma migrate` com um migration SQL customizado.

4. Gere e aplique:
```bash
npx prisma generate
npx prisma db push  # ou: npx prisma migrate dev --name init-postgres
```

**Nenhuma mudança necessária nos API routes** — as queries Prisma são idênticas para SQLite e PostgreSQL.

### SQLite/PostgreSQL → MySQL

**Arquivos para alterar:**
- `prisma/schema.prisma`
- `.env`

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

```env
DATABASE_URL=mysql://usuario:senha@host:3306/fleetcontrol
```

> **Atenção**: `@default(cuid())` funciona em MySQL, mas se preferir UUIDs nativos, troque para `@default(uuid())` e ajuste o tipo para `String @db.Uuid`.

### Para qualquer banco não suportado pelo Prisma

1. Gere o SQL equivalente ao schema manualmente (12 tabelas, veja o `schema.prisma` para referência)
2. Substitua `lib/db.ts` pela conexão do seu driver
3. Reescreva as queries nos 26 API routes

---

## 2. ORM

### Prisma → Drizzle ORM

**Arquivos para alterar:**
- `prisma/schema.prisma` → `src/db/schema.ts` (Drizzle schema)
- `src/lib/db.ts` → instância Drizzle
- **Todos os 26 API routes** (sintaxe de queries diferente)

**Esforço: ⭐⭐⭐ Alto** (~26 arquivos)

1. Instale Drizzle:
```bash
npm uninstall @prisma/client prisma
npm install drizzle-orm
npm install -D drizzle-kit
```

2. Converta o schema Prisma para Drizzle em `src/db/schema.ts`:
```typescript
import { pgTable, text, boolean, integer, float, datetime } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('User', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email:        text('email').notNull().unique(),
  name:         text('name').notNull(),
  passwordHash: text('passwordHash').notNull(),
  role:         text('role').default('PASSENGER'),
  branchId:     text('branchId'),
  branchName:   text('branchName'),
  isActive:     boolean('isActive').default(true),
  createdAt:    datetime('createdAt', { mode: 'date' }).defaultNow(),
  updatedAt:    datetime('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
})

export const drivers = pgTable('Driver', {
  id:               text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:           text('userId').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  licenseNumber:    text('licenseNumber'),
  licenseExpiry:    datetime('licenseExpiry', { mode: 'date' }),
  phone:            text('phone'),
  status:           text('status').default('AVAILABLE'),
  currentVehicleId: text('currentVehicleId').unique(),
  createdAt:        datetime('createdAt', { mode: 'date' }).defaultNow(),
  updatedAt:        datetime('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
})

// ... repita para os demais 10 modelos
```

3. Crie a instância:
```typescript
// src/lib/db.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/db/schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool, { schema })
```

4. Reescreva as queries nos routes. Exemplo de antes/depois:

**Prisma:**
```typescript
const users = await db.user.findMany({
  where: { role: 'DRIVER', isActive: true },
  include: { driver: true },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' },
})
const total = await db.user.count({ where: { role: 'DRIVER', isActive: true } })
```

**Drizzle:**
```typescript
import { eq, and, desc, sql } from 'drizzle-orm'

const conditions = [eq(schema.users.role, 'DRIVER'), eq(schema.users.isActive, true)]
const [users, [{ count: total }]] = await Promise.all([
  db.query.users.findMany({
    where: and(...conditions),
    with: { driver: true },
    offset: (page - 1) * limit,
    limit,
    orderBy: [desc(schema.users.createdAt)],
  }),
  db.select({ count: sql<number>`count(*)` }).from(schema.users).where(and(...conditions)),
])
```

5. Mude o build command (remova `prisma generate` e `prisma db push`):
```bash
npx drizzle-kit push    # sync schema
npm run build          # build Next.js
```

### Prisma → TypeORM

**Esforço: ⭐⭐⭐ Alto** (~26 arquivos)

1. Instale TypeORM:
```bash
npm uninstall @prisma/client prisma
npm install typeorm reflect-metadata
npm install -D @types/node
```

2. Crie entidades em `src/entities/`:
```typescript
// src/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, Index } from 'typeorm'

@Entity()
@Index(['role'])
@Index(['branchId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column()
  name: string

  @Column({ name: 'passwordHash' })
  passwordHash: string

  @Column({ default: 'PASSENGER' })
  role: string

  // ... demais campos e relações
}
```

3. Configure a conexão:
```typescript
// src/lib/db.ts
import { DataSource } from 'typeorm'
import { User } from '@/entities/user.entity'
import { Vehicle } from '@/entities/vehicle.entity'
// ... import demais entidades

export const db = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Vehicle, Driver, /* ... */],
  synchronize: true, // usar migrations em prod
})
```

4. Reescreva queries:
```typescript
// Prisma
const users = await db.user.findMany({ where: { role: 'DRIVER' }, skip: 0, take: 20 })

// TypeORM
const users = await db.manager.find(User, { where: { role: 'DRIVER' }, skip: 0, take: 20 })
```

### Prisma → Kysely (SQL puro tipado)

**Esforço: ⭐⭐⭐ Alto**

Kysely é ideal se você quer SQL puro com tipagem. Use [kysely-codegen](https://github.com/kysely-org/kysely-codegen) para gerar os tipos do banco existente, depois reescreva as queries.

---

## 3. Framework Web

### Next.js → Express / Fastify / Hono

**Arquivos para alterar:**
- Toda a pasta `src/app/api/` → controllers separados
- `src/app/page.tsx`, `src/app/layout.tsx` → não existem mais
- `src/lib/api.ts` → client fetch continua igual (usa fetch puro)
- `src/components/dashboard/*` → viram um app React separado
- `package.json` → troca de dependências

**Esforço: ⭐⭐⭐ Alto** (reestruturação, mas a lógica é reaproveitável)

1. A lógica de negócio nos routes é **framework-agnostic** — ela usa `request.json()`, `request.headers.get()`, e retorna JSON. Apenas os imports mudam:

**Next.js:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ success: true, data: result })
}
```

**Express:**
```typescript
import { Request, Response } from 'express'
export async function getHandler(req: Request, res: Response) {
  const body = req.body
  res.json({ success: true, data: result })
}
```

**Hono:**
```typescript
import { Hono } from 'hono'
const app = new Hono()
app.get('/api/rides', async (c) => {
  const body = await c.req.json()
  return c.json({ success: true, data: result })
})
```

2. O `auth-middleware.ts` usa `NextRequest` para extrair headers — troque para `Request` padrão:

```typescript
// Antes (Next.js)
export function getRequestUser(request: NextRequest): JwtPayload {
  const authHeader = request.headers.get('authorization')
}

// Depois (qualquer framework)
export function getRequestUser(request: Request): JwtPayload {
  const authHeader = request.headers.get('authorization')  // idêntico!
}
```

3. O `audit.ts` usa `NextRequest` para IP e User-Agent — mesmo padrão funciona com `Request` padrão.

4. O frontend React pode ser servido como SPA estático (build com Vite) ou como parte de um template engine.

### Next.js → Remix

Remix também usa React + file-based routing. A transição é a mais suave:

1. Mova API routes para `app/routes/api/`
2. Mova o dashboard para `app/routes/dashboard.tsx`
3. Troque `NextResponse.json()` por `json()` do Remix
4. Troque `getRequestUser(request)` para usar o `request` do Remix

### Next.js → Nuxt (Vue)

Se quiser trocar React por Vue:

1. Reescreva o dashboard em Vue 3 (Composition API)
2. Os API routes podem ser reescritos como server routes do Nuxt
3. Troque Zustand por Pinia
4. Troque shadcn/ui por shadcn-vue ou Naive UI
5. A API REST continua a mesma — o frontend é apenas um consumer diferente

---

## 4. Autenticação

### JWT Custom → NextAuth.js / Auth.js

**Arquivos para alterar:**
- `src/lib/auth.ts` → remover completamente
- `src/lib/auth-middleware.ts` → usar `getServerSession()` do NextAuth
- `src/app/api/auth/login/route.ts` → substituído pelo NextAuth handler
- `src/app/api/auth/logout/route.ts` → substituído pelo NextAuth handler
- `src/app/api/auth/refresh/route.ts` → o NextAuth gerencia sessions automaticamente
- `src/stores/auth-store.ts` → adaptar para consumir session do NextAuth
- `src/components/dashboard/login-form.tsx` → usar `signIn()` do NextAuth
- `prisma/schema.prisma` → adicionar modelo `Account` e `Session` do NextAuth

**Esforço: ⭐⭐ Médio**

1. Instale NextAuth:
```bash
npm install next-auth@beta
```

2. Crie o handler em `src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { comparePassword } from '@/lib/auth-helpers' // mantenha só hash/compare

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        const user = await db.user.findUnique({ where: { email: credentials.email } })
        if (!user || !user.isActive) return null
        const valid = await comparePassword(credentials.password, user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) { if (user) { token.role = user.role } return token },
    async session({ session, token }) { session.user.role = token.role; return session },
  },
})

export const { GET, POST } = handlers
```

3. Proteja routes:
```typescript
// Antes
const user = getRequestUser(request)

// Depois
const session = await auth()
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

4. No frontend, troque `apiFetch` por `useSession()` do NextAuth ou continue usando `apiFetch` com o token da session.

### JWT Custom → Clerk

**Arquivos para alterar:**
- `src/lib/auth.ts` → remover
- `src/lib/auth-middleware.ts` → usar `auth()` do Clerk
- `src/app/api/auth/*` → remover tudo, Clerk gerencia
- `src/stores/auth-store.ts` → remover (Clerk fornece hooks)
- `src/components/dashboard/login-form.tsx` → usar `<SignIn />` do Clerk
- `src/app/layout.tsx` → adicionar `<ClerkProvider>`

**Esforço: ⭐⭐ Médio**

```bash
npm install @clerk/nextjs
```

```typescript
// layout.tsx
import { ClerkProvider } from '@clerk/nextjs'
export default function RootLayout({ children }) {
  return <ClerkProvider>{children}</ClerkProvider>
}

// Em qualquer API route:
import { auth } from '@clerk/nextjs/server'
const { userId } = auth()
```

### JWT Custom → Lucia

Lucia é o mais próximo do JWT custom — transição mais simples:

```bash
npm install lucia @lucia-auth/adapter-prisma
```

A principal diferença é que Lucia usa sessions no banco em vez de JWT stateless.

---

## 5. UI Components

### shadcn/ui → Material UI (MUI)

**Arquivos para alterar:**
- `src/components/ui/*` (todos os ~30 componentes)
- `src/components/dashboard/dashboard-shell.tsx` (imports e uso)
- `src/components/dashboard/login-form.tsx`

**Esforço: ⭐⭐ Médio**

O dashboard-shell.tsx usa estes componentes shadcn/ui:
`Button`, `Input`, `Card`, `Dialog`, `Select`, `Table`, `Badge`, `Tabs`, `DropdownMenu`, `Sidebar`, `Tooltip`, `Separator`, `Skeleton`, `ScrollArea`, `Switch`, `Label`

Para cada um, substitua pelo equivalente MUI:

| shadcn/ui | Material UI |
|-----------|-------------|
| `Button` | `Button` from `@mui/material` |
| `Input` | `TextField` |
| `Card` | `Card` / `Paper` |
| `Dialog` | `Dialog` |
| `Select` | `Select` / `Autocomplete` |
| `Table` | `Table` |
| `Badge` | `Chip` |
| `Tabs` | `Tabs` |
| `DropdownMenu` | `Menu` |
| `Tooltip` | `Tooltip` |
| `Switch` | `Switch` |
| `Sidebar` | `Drawer` (permanent) |

### shadcn/ui → Ant Design

Mesma lógica — substitua componente por componente. Ant Design tem `Table` com features built-in (pagination, sorting) que podem simplificar o `CrudTable<T>`.

### shadcn/ui → Chakra UI

Mesma abordagem. Chakra tem API similar ao shadcn/ui (baseada em Radix), então a transição é mais suave.

---

## 6. CSS / Estilização

### Tailwind CSS → CSS Modules

**Arquivos para alterar:**
- `src/components/dashboard/dashboard-shell.tsx` (todas as classes Tailwind)
- `src/components/dashboard/login-form.tsx`
- `src/app/globals.css`
- `tailwind.config.ts` → remover

**Esforço: ⭐⭐⭐ Alto** (muitas classes inline)

O dashboard-shell.tsx tem milhares de classes Tailwind inline. Para cada bloco JSX, crie um módulo CSS:

```css
/* Dashboard.module.css */
.sidebar { width: 256px; background: white; border-right: 1px solid #e5e7eb; }
.sidebarCollapsed { width: 64px; }
.topbar { height: 64px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; padding: 0 16px; }
.metricCard { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
```

### Tailwind CSS → Styled Components / Emotion

Mesma abordagem — crie componentes estilizados para cada seção.

### Tailwind CSS → CSS-in-JS (vanilla)

Use `style` props ou `CSS` tagged template literals do `goober` / `stitches`.

---

## 7. Estado Global

### Zustand → Redux Toolkit

**Arquivos para alterar:**
- `src/stores/auth-store.ts` (~37 linhas)

**Esforço: ⭐ Baixo**

```typescript
// stores/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState { user: UserInfo | null; accessToken: string | null; isAuthenticated: boolean }

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, accessToken: null, isAuthenticated: false },
  reducers: {
    login: (state, action: PayloadAction<{ accessToken: string; user: UserInfo }>) => {
      state.accessToken = action.payload.accessToken
      state.user = action.payload.user
      state.isAuthenticated = true
      localStorage.setItem('accessToken', action.payload.accessToken)
      localStorage.setItem('user', JSON.stringify(action.payload.user))
    },
    logout: (state) => {
      state.user = null
      state.accessToken = null
      state.isAuthenticated = false
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
    },
  },
})

export const { login, logout } = authSlice.actions
```

Depois troque `useAuthStore()` por `useSelector()` / `useDispatch()` nos componentes.

### Zustand → Jotai

```typescript
import { atom } from 'jotai'

export const userAtom = atom<UserInfo | null>(null)
export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null)
export const loginAtom = atom(null, (_, set, payload: { accessToken: string; user: UserInfo }) => {
  set(userAtom, payload.user)
  localStorage.setItem('accessToken', payload.accessToken)
  localStorage.setItem('user', JSON.stringify(payload.user))
})
```

### Zustand → React Context

O store tem 37 linhas — facilmente recriável com `createContext` + `useReducer`.

---

## 8. Rastreamento WebSocket

### Socket.io → Pusher

**Arquivos para alterar:**
- `mini-services/tracking-service/index.ts` → substituído pelo Pusher (hosted)
- `dashboard-shell.tsx` → trocar `socket.io-client` por `pusher-js`

**Esforço: ⭐⭐ Médio**

1. Remova o tracking service (Pusher é SaaS — não precisa de servidor próprio)
2. No cliente:
```typescript
// Antes (Socket.io)
import { io } from 'socket.io-client'
const socket = io('ws://localhost:3003')
socket.on('vehicle-location', (data) => { ... })

// Depois (Pusher)
import Pusher from 'pusher-js'
const pusher = new Pusher(APP_KEY, { cluster: 'sa-east-1' })
const channel = pusher.subscribe('dashboard')
channel.bind('vehicle-location', (data) => { ... })
```

3. Para emitir, use o Pusher server SDK nos API routes:
```typescript
import Pusher from 'pusher'
const pusher = new Pusher({ appId, key, secret, cluster: 'sa-east-1' })
await pusher.trigger('dashboard', 'vehicle-location', locationData)
```

### Socket.io → Ably

Mesma abordagem do Pusher. Substitua o client SDK e use o Ably REST SDK para publicar.

### Socket.io → Firebase Realtime DB

```typescript
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue } from 'firebase/database'

const db = getDatabase()
onValue(ref(db, 'vehicles/' + vehicleId), (snapshot) => {
  const data = snapshot.val()
  // update UI
})
```

---

## 9. Exportação de Relatórios

### SheetJS → ExcelJS

**Arquivos para alterar:**
- `src/app/api/reports/rides/route.ts` (~100 linhas)

**Esforço: ⭐ Baixo**

```typescript
// Antes (SheetJS)
import * as XLSX from 'xlsx'
const wb = XLSX.utils.book_new()
const ws = XLSX.utils.json_to_sheet(rows)
XLSX.utils.book_append_sheet(wb, ws, 'Rides')
const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

// Depois (ExcelJS)
import ExcelJS from 'exceljs'
const wb = new ExcelJS.Workbook()
const ws = wb.addWorksheet('Rides')
ws.columns = Object.keys(rows[0]).map(key => ({ header: key, key }))
rows.forEach(row => ws.addRow(row))
const buffer = await wb.xlsx.writeBuffer()
```

### SheetJS → CSV Writer

Para CSV, nem precisa de lib:
```typescript
const csv = [
  Object.keys(rows[0]).join(','),
  ...rows.map(r => Object.values(r).join(','))
].join('\n')
```

---

## 10. Validação de Forms

### Zod → Yup

**Arquivos para alterar:**
- Qualquer lugar que importar de `zod`

**Esforço: ⭐ Baixo** (pouquíssimos arquivos usam Zod diretamente — a validação principal é nos API routes que checam campos manualmente)

```typescript
// Zod
import { z } from 'zod'
const schema = z.object({ email: z.string().email(), name: z.string().min(2) })

// Yup
import * as yup from 'yup'
const schema = yup.object({ email: yup.string().email().required(), name: yup.string().min(2).required() })
```

Se usa `react-hook-form` com `@hookform/resolvers/zod`, troque para `@hookform/resolvers/yup`.

---

## 11. IDs / Strategy

### CUID → UUID

**Arquivos para alterar:**
- `prisma/schema.prisma` (trocar `@default(cuid())` por `@default(uuid())`)

**Esforço: ⭐ Baixo**

```prisma
// Antes
id String @id @default(cuid())

// Depois
id String @id @default(uuid())
```

> Em PostgreSQL, use `@db.Uuid` para UUID nativo do banco.

### CUID → Auto-increment (Int)

```prisma
id Int @id @default(autoincrement())
```

> Requer mudar o tipo de `id` em todos os tipos TypeScript de `string` para `number`.

### CUID → NanoID / ULID

```prisma
id String @id @default(nanoid())  // requer extension Prisma customizado
```

Para NanoID, será necessário um middleware Prisma:
```typescript
prisma.$use(async (params, next) => {
  if (params.action === 'create' && !params.args.data.id) {
    params.args.data.id = nanoid() // ou customId()
  }
  return next(params)
})
```

---

## Matriz de Impacto Cruzado

Esta tabela mostra quais arquivos são afetados ao trocar cada componente:

| Migração afeta → | schema.prisma | lib/db.ts | lib/auth.ts | lib/auth-mw | api/ routes | dashboard | components/ui | tracking-service | stores | api.ts (client) |
|------------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Banco de dados** | ✅ | ✅ | | | | | | | | |
| **ORM** | ✅ | ✅ | | | ✅ | | | | | |
| **Framework Web** | | | | ✅ | ✅ | ✅ | | | | |
| **Autenticação** | | | ✅ | ✅ | ✅ | ✅ | | | ✅ | ✅ |
| **UI Components** | | | | | | ✅ | ✅ | | | |
| **CSS** | | | | | | ✅ | | | | |
| **Estado Global** | | | | | | ✅ | | | ✅ | |
| **WebSocket** | | | | | | ✅ | | ✅ | | ✅ |
| **Exportação** | | | | | ✅ | | | | | |
| **Validação** | | | | | ✅ | | | | | |
| **IDs** | ✅ | | | | | | | | | |

Legenda: ✅ = arquivos que precisam de alteração

---

## Recomendações por Cenário

### "Quero trocar apenas o banco para PostgreSQL"
→ Veja a seção [1. Banco de Dados](#1-banco-de-dados). Esforço: **⭐ Baixo**.

### "Quero usar Vue ao invés de React"
→ Troque Framework Web (seção 3) + UI Components (seção 5) + Estado (seção 7). Esforço: **⭐⭐⭐ Alto**.

### "Quero usar Django/Python no backend"
→ Mantenha o React como frontend SPA consumindo a API REST. Reescreva os 26 API routes em Django views/serializers. A API contract (JSON) permanece idêntica.

### "Quero usar Supabase (BaaS)"
→ Supabase substitui: Banco (PostgreSQL), Auth ( JWT, sessões), Realtime (WebSocket). Mantém: Frontend React, Tailwind, shadcn/ui. Esforço: **⭐⭐ Médio**.

### "Quero usar tRPC ao invés de REST"
→ Mantenha Next.js. Substitua API routes por tRPC routers. Troque `apiFetch()` por tRPC client. Esforço: **⭐⭐ Médio**.

---

<p align="center">
  <strong>FleetControl</strong> — Construído para evoluir.
</p>
