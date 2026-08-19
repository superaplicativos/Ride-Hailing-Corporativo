'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { apiFetch, formatDate, formatStatus, statusColor, roleLabel, roleColor, buildQuery } from '@/lib/api'
import { LoginForm } from './login-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  LayoutDashboard, Users, Car, UserCheck, UserCircle, Building2, Route, ShieldCheck,
  ClipboardCheck, FileBarChart, ScrollText, LogOut, Menu, X, Search, Plus, Pencil, Trash2,
  ChevronLeft, ChevronRight, Download, Activity, CarFront, MapPin, Clock, CheckCircle2,
  AlertTriangle, XCircle, TrendingUp, Eye
} from 'lucide-react'

// ============ NAVIGATION ============
const NAV_ITEMS = [
  { id: 'overview', label: 'Painel Geral', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { id: 'users', label: 'Usuários', icon: Users, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { id: 'vehicles', label: 'Veículos', icon: Car, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { id: 'drivers', label: 'Motoristas', icon: UserCheck, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { id: 'passengers', label: 'Passageiros', icon: UserCircle, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { id: 'cost-centers', label: 'Centros de Custo', icon: Building2, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { id: 'rides', label: 'Viagens', icon: Route, roles: ['SUPER_ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'] },
  { id: 'rules', label: 'Regras', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
  { id: 'checkouts', label: 'Frota (Check)', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { id: 'reports', label: 'Relatórios', icon: FileBarChart, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { id: 'audit', label: 'Auditoria', icon: ScrollText, roles: ['SUPER_ADMIN'] },
]

type Page = typeof NAV_ITEMS[number]['id']

// ============ MAIN SHELL ============
export function DashboardShell() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const [page, setPage] = useState<Page>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isAuthenticated || !user) return <LoginForm />

  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role))
  if (navItems.length > 0 && !navItems.find((n) => n.id === page)) {
    setPage(navItems[0].id)
  }

  function handleLogout() {
    apiFetch('/auth/logout', { method: 'POST' })
    logout()
    toast.success('Logout realizado')
  }

  const currentPage = navItems.find((n) => n.id === page)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">FleetControl</h2>
              <p className="text-[10px] text-slate-500">Ride Hailing Corporativo</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 py-3">
          <nav className="px-3 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = page === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => { setPage(item.id); setSidebarOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </ScrollArea>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
            <Badge variant="outline" className={`mt-1 text-[10px] ${roleColor(user.role)}`}>
              {roleLabel(user.role)}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1">
            <Menu className="w-5 h-5" />
          </button>
          {currentPage && (
            <div className="flex items-center gap-2">
              <currentPage.icon className="w-4 h-4 text-slate-500" />
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{currentPage.label}</h1>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${roleColor(user.role)}`}>
              {roleLabel(user.role)}
            </Badge>
            {user.branchName && (
              <Badge variant="outline" className="text-xs">
                {user.branchName}
              </Badge>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {page === 'overview' && <OverviewPage />}
          {page === 'users' && <UsersPage />}
          {page === 'vehicles' && <VehiclesPage />}
          {page === 'drivers' && <DriversPage />}
          {page === 'passengers' && <PassengersPage />}
          {page === 'cost-centers' && <CostCentersPage />}
          {page === 'rides' && <RidesPage userRole={user.role} userId={user.id} />}
          {page === 'rules' && <RulesPage />}
          {page === 'checkouts' && <CheckoutsPage />}
          {page === 'reports' && <ReportsPage />}
          {page === 'audit' && <AuditPage />}
        </main>
      </div>
    </div>
  )
}

// ============ GENERIC PAGINATION ============
function Pagination({ page: p, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-slate-500">Página {p} de {totalPages}</p>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" disabled={p <= 1} onClick={() => onPageChange(p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
        <Button size="sm" variant="outline" disabled={p >= totalPages} onClick={() => onPageChange(p + 1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>
    </div>
  )
}

// ============ OVERVIEW PAGE ============
function OverviewPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await apiFetch('/metrics')
      if (data?.data) setMetrics(data.data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><Activity className="w-6 h-6 animate-pulse text-slate-400" /></div>
  if (!metrics) return <p className="text-slate-500">Erro ao carregar métricas.</p>

  const cards = [
    { label: 'Total de Usuários', value: metrics.totalUsers || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Veículos Ativos', value: metrics.activeVehicles || 0, icon: CarFront, color: 'bg-emerald-500' },
    { label: 'Total de Motoristas', value: metrics.totalDrivers || 0, icon: UserCheck, color: 'bg-amber-500' },
    { label: 'Total de Viagens', value: metrics.totalRides || 0, icon: Route, color: 'bg-purple-500' },
  ]

  const statusData = metrics.ridesByStatus || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{c.label}</p>
                  <p className="text-3xl font-bold mt-1">{c.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center`}>
                  <c.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Viagens por Status</CardTitle>
          <CardDescription>Distribuição atual das viagens no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(statusData).length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma viagem registrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusData).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <Badge className={statusColor(status)}>{formatStatus(status)}</Badge>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, ((count as number) / Math.max(metrics.totalRides, 1)) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count as number}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Acesso Rápido</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start" onClick={() => {}} disabled>📝 Nova Viagem</Button>
            <Button variant="outline" className="justify-start" onClick={() => {}} disabled>🚗 Novo Veículo</Button>
            <Button variant="outline" className="justify-start" onClick={() => {}} disabled>👤 Novo Usuário</Button>
            <Button variant="outline" className="justify-start" onClick={() => {}} disabled>📊 Exportar Relatório</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Status do Sistema</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm">API operacional</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm">Banco de dados conectado</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm">WebSocket ativo (porta 3003)</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============ GENERIC CRUD TABLE COMPONENT ============
function CrudTable<T extends { id: string }>({
  title,
  columns,
  fetchData,
  createData,
  updateData,
  deleteData,
  renderForm,
  canCreate = true,
}: {
  title: string
  columns: { key: string; label: string; render?: (item: any) => React.ReactNode }[]
  fetchData: (params: Record<string, string>) => Promise<{ data: any; status: number }>
  createData?: (body: any) => Promise<{ data: any; status: number }>
  updateData?: (id: string, body: any) => Promise<{ data: any; status: number }>
  deleteData?: (id: string) => Promise<{ data: any; status: number }>
  renderForm: (item: Partial<T> | null, onChange: (field: string, value: any) => void) => React.ReactNode
  canCreate?: boolean
}) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<T> | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<T | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    const query = buildQuery({ page, limit: 10, search: search || undefined })
    fetchData(query).then(({ data }) => {
      if (cancelled) return
      if (data?.data) {
        setItems(data.data)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [page, search, fetchData, reloadKey])

  function openCreate() {
    setEditing(null)
    setFormData({})
    setDialogOpen(true)
  }

  function openEdit(item: T) {
    setEditing(item)
    setFormData({ ...item })
    setDialogOpen(true)
  }

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    if (editing?.id) {
      const { error } = await updateData?.(editing.id, formData) || { error: 'Não implementado' }
      if (error) { toast.error(error); setSaving(false); return }
      toast.success('Atualizado com sucesso')
    } else {
      const { error } = await createData?.(formData) || { error: 'Não implementado' }
      if (error) { toast.error(error); setSaving(false); return }
      toast.success('Criado com sucesso')
    }
    setSaving(false)
    setDialogOpen(false)
    setReloadKey((k) => k + 1)
  }

  async function handleDelete(item: T) {
    if (!deleteData) return
    const { error } = await deleteData(item.id)
    if (error) { toast.error(error); return }
    toast.success('Excluído com sucesso')
    setReloadKey((k) => k + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        {canCreate && createData && (
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" /> Novo
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-8 text-slate-500">Nenhum registro encontrado.</TableCell></TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setDetailItem(item); setDetailOpen(true) }}><Eye className="w-3.5 h-3.5" /></Button>
                        {updateData && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>}
                        {deleteData && <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(item)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} {title}</DialogTitle>
            <DialogDescription>Preencha os campos abaixo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {renderForm(formData, handleChange)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {detailItem && columns.map((col) => (
              <div key={col.key} className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-sm text-slate-500">{col.label}</span>
                <span className="text-sm font-medium">{col.render ? col.render(detailItem) : (detailItem as any)[col.key]}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ USERS PAGE ============
function UsersPage() {
  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'E-mail' },
    { key: 'role', label: 'Perfil', render: (u: any) => <Badge className={`text-xs ${roleColor(u.role)}`}>{roleLabel(u.role)}</Badge> },
    { key: 'branchName', label: 'Filial', render: (u: any) => u.branchName || '-' },
    { key: 'isActive', label: 'Status', render: (u: any) => <Badge className={u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>{u.isActive ? 'Ativo' : 'Inativo'}</Badge> },
  ]

  return (
    <CrudTable<any>
      title="Usuário"
      columns={columns}
      fetchData={(q) => apiFetch(`/users${q}`)}
      createData={(body) => apiFetch('/users', { method: 'POST', body: JSON.stringify(body) })}
      updateData={(id, body) => apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) })}
      deleteData={(id) => apiFetch(`/users/${id}`, { method: 'DELETE' })}
      renderForm={(data, onChange) => (
        <>
          <div className="space-y-1"><Label>Nome</Label><Input value={data.name || ''} onChange={(e) => onChange('name', e.target.value)} /></div>
          <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={data.email || ''} onChange={(e) => onChange('email', e.target.value)} /></div>
          <div className="space-y-1"><Label>Senha {data.id ? '(deixe vazio para manter)' : ''}</Label><Input type="password" onChange={(e) => onChange('password', e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Perfil</Label>
            <Select value={data.role || 'PASSENGER'} onValueChange={(v) => onChange('role', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPER_ADMIN">Super Administrador</SelectItem>
                <SelectItem value="MANAGER">Gerente</SelectItem>
                <SelectItem value="DRIVER">Motorista</SelectItem>
                <SelectItem value="PASSENGER">Passageiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Filial (opcional)</Label><Input value={data.branchId || ''} onChange={(e) => onChange('branchId', e.target.value)} placeholder="ID da filial" /></div>
          <div className="space-y-1"><Label>Nome da Filial (opcional)</Label><Input value={data.branchName || ''} onChange={(e) => onChange('branchName', e.target.value)} /></div>
        </>
      )}
    />
  )
}

// ============ VEHICLES PAGE ============
function VehiclesPage() {
  const columns = [
    { key: 'plate', label: 'Placa' },
    { key: 'model', label: 'Modelo' },
    { key: 'capacity', label: 'Capacidade', render: (v: any) => `${v.capacity} lugares` },
    { key: 'trackerId', label: 'Rastreador', render: (v: any) => v.trackerId || '-' },
    { key: 'status', label: 'Status', render: (v: any) => <Badge className={`text-xs ${statusColor(v.status)}`}>{formatStatus(v.status)}</Badge> },
  ]

  return (
    <CrudTable<any>
      title="Veículo"
      columns={columns}
      fetchData={(q) => apiFetch(`/vehicles${q}`)}
      createData={(body) => apiFetch('/vehicles', { method: 'POST', body: JSON.stringify(body) })}
      updateData={(id, body) => apiFetch(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(body) })}
      deleteData={(id) => apiFetch(`/vehicles/${id}`, { method: 'DELETE' })}
      renderForm={(data, onChange) => (
        <>
          <div className="space-y-1"><Label>Placa</Label><Input value={data.plate || ''} onChange={(e) => onChange('plate', e.target.value)} placeholder="ABC-1234" /></div>
          <div className="space-y-1"><Label>Modelo</Label><Input value={data.model || ''} onChange={(e) => onChange('model', e.target.value)} placeholder="Toyota Corolla 2024" /></div>
          <div className="space-y-1"><Label>Capacidade</Label><Input type="number" value={data.capacity || 4} onChange={(e) => onChange('capacity', parseInt(e.target.value) || 4)} /></div>
          <div className="space-y-1"><Label>ID do Rastreador</Label><Input value={data.trackerId || ''} onChange={(e) => onChange('trackerId', e.target.value)} placeholder="tracker-001" /></div>
          <div className="space-y-1"><Label>Cor</Label><Input value={data.color || ''} onChange={(e) => onChange('color', e.target.value)} /></div>
          <div className="space-y-1"><Label>Ano</Label><Input type="number" value={data.year || ''} onChange={(e) => onChange('year', parseInt(e.target.value) || null)} /></div>
          {data.id && (
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={data.status || 'AVAILABLE'} onValueChange={(v) => onChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Disponível</SelectItem>
                  <SelectItem value="EN_ROUTE">A Caminho</SelectItem>
                  <SelectItem value="IN_RIDE">Em Viagem</SelectItem>
                  <SelectItem value="OFFLINE">Offline</SelectItem>
                  <SelectItem value="MAINTENANCE">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}
    />
  )
}

// ============ DRIVERS PAGE ============
function DriversPage() {
  const [users, setUsers] = useState<any[]>([])
  useEffect(() => {
    apiFetch('/users?role=DRIVER&limit=100').then(({ data }) => {
      if (data?.data) setUsers(data.data)
    })
  }, [])

  const columns = [
    { key: 'name', label: 'Nome', render: (d: any) => d.user?.name || '-' },
    { key: 'email', label: 'E-mail', render: (d: any) => d.user?.email || '-' },
    { key: 'phone', label: 'Telefone', render: (d: any) => d.phone || '-' },
    { key: 'licenseNumber', label: 'CNH', render: (d: any) => d.licenseNumber || '-' },
    { key: 'status', label: 'Status', render: (d: any) => <Badge className={`text-xs ${statusColor(d.status)}`}>{formatStatus(d.status)}</Badge> },
  ]

  return (
    <CrudTable<any>
      title="Motorista"
      columns={columns}
      fetchData={(q) => apiFetch(`/drivers${q}`)}
      createData={(body) => apiFetch('/drivers', { method: 'POST', body: JSON.stringify(body) })}
      updateData={(id, body) => apiFetch(`/drivers/${id}`, { method: 'PUT', body: JSON.stringify(body) })}
      deleteData={(id) => apiFetch(`/drivers/${id}`, { method: 'DELETE' })}
      renderForm={(data, onChange) => (
        <>
          <div className="space-y-1">
            <Label>Usuário (Motorista)</Label>
            <Select value={data.userId || ''} onValueChange={(v) => onChange('userId', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Número da CNH</Label><Input value={data.licenseNumber || ''} onChange={(e) => onChange('licenseNumber', e.target.value)} /></div>
          <div className="space-y-1"><Label>Validade da CNH</Label><Input type="date" value={data.licenseExpiry ? data.licenseExpiry.split('T')[0] : ''} onChange={(e) => onChange('licenseExpiry', e.target.value)} /></div>
          <div className="space-y-1"><Label>Telefone</Label><Input value={data.phone || ''} onChange={(e) => onChange('phone', e.target.value)} /></div>
        </>
      )}
    />
  )
}

// ============ PASSENGERS PAGE ============
function PassengersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])
  useEffect(() => {
    apiFetch('/users?role=PASSENGER&limit=100').then(({ data }) => { if (data?.data) setUsers(data.data) })
    apiFetch('/cost-centers?limit=100').then(({ data }) => { if (data?.data) setCostCenters(data.data) })
  }, [])

  const columns = [
    { key: 'name', label: 'Nome', render: (p: any) => p.user?.name || '-' },
    { key: 'email', label: 'E-mail', render: (p: any) => p.user?.email || '-' },
    { key: 'phone', label: 'Telefone', render: (p: any) => p.phone || '-' },
    { key: 'costCenter', label: 'Centro de Custo', render: (p: any) => p.costCenter?.name || '-' },
  ]

  return (
    <CrudTable<any>
      title="Passageiro"
      columns={columns}
      fetchData={(q) => apiFetch(`/passengers${q}`)}
      createData={(body) => apiFetch('/passengers', { method: 'POST', body: JSON.stringify(body) })}
      updateData={(id, body) => apiFetch(`/passengers/${id}`, { method: 'PUT', body: JSON.stringify(body) })}
      deleteData={(id) => apiFetch(`/passengers/${id}`, { method: 'DELETE' })}
      renderForm={(data, onChange) => (
        <>
          <div className="space-y-1">
            <Label>Usuário (Passageiro)</Label>
            <Select value={data.userId || ''} onValueChange={(v) => onChange('userId', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Centro de Custo</Label>
            <Select value={data.costCenterId || ''} onValueChange={(v) => onChange('costCenterId', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {costCenters.map((cc: any) => <SelectItem key={cc.id} value={cc.id}>{cc.name} ({cc.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Telefone</Label><Input value={data.phone || ''} onChange={(e) => onChange('phone', e.target.value)} /></div>
        </>
      )}
    />
  )
}

// ============ COST CENTERS PAGE ============
function CostCentersPage() {
  const columns = [
    { key: 'code', label: 'Código' },
    { key: 'name', label: 'Nome' },
    { key: 'description', label: 'Descrição', render: (cc: any) => cc.description || '-' },
    { key: 'isActive', label: 'Status', render: (cc: any) => <Badge className={cc.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>{cc.isActive ? 'Ativo' : 'Inativo'}</Badge> },
  ]

  return (
    <CrudTable<any>
      title="Centro de Custo"
      columns={columns}
      fetchData={(q) => apiFetch(`/cost-centers${q}`)}
      createData={(body) => apiFetch('/cost-centers', { method: 'POST', body: JSON.stringify(body) })}
      updateData={(id, body) => apiFetch(`/cost-centers/${id}`, { method: 'PUT', body: JSON.stringify(body) })}
      deleteData={(id) => apiFetch(`/cost-centers/${id}`, { method: 'DELETE' })}
      renderForm={(data, onChange) => (
        <>
          <div className="space-y-1"><Label>Código</Label><Input value={data.code || ''} onChange={(e) => onChange('code', e.target.value)} placeholder="CC-001" /></div>
          <div className="space-y-1"><Label>Nome</Label><Input value={data.name || ''} onChange={(e) => onChange('name', e.target.value)} placeholder="Marketing" /></div>
          <div className="space-y-1"><Label>Descrição</Label><Input value={data.description || ''} onChange={(e) => onChange('description', e.target.value)} /></div>
        </>
      )}
    />
  )
}

// ============ RIDES PAGE ============
function RidesPage({ userRole, userId }: { userRole: string; userId: string }) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [rides, setRides] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dispatchDialog, setDispatchDialog] = useState(false)
  const [selectedRide, setSelectedRide] = useState<any>(null)
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [dispatchDriver, setDispatchDriver] = useState('')
  const [dispatchVehicle, setDispatchVehicle] = useState('')
  const [statusDialog, setStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [ridesReload, setRidesReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    const q = buildQuery({ page, limit: 10, status: statusFilter !== 'all' ? statusFilter : undefined })
    apiFetch(`/rides${q}`).then(({ data }) => {
      if (cancelled) return
      if (data?.data) {
        setRides(data.data)
        setTotalPages(data.pagination?.totalPages || 1)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [page, statusFilter, ridesReload])

  async function openDispatch(ride: any) {
    setSelectedRide(ride)
    setDispatchDialog(true)
    const [dRes, vRes] = await Promise.all([
      apiFetch('/drivers?status=AVAILABLE&limit=100'),
      apiFetch('/vehicles?status=AVAILABLE&limit=100'),
    ])
    if (dRes.data?.data) setDrivers(dRes.data.data)
    if (vRes.data?.data) setVehicles(vRes.data.data)
  }

  async function handleDispatch() {
    if (!selectedRide || !dispatchDriver || !dispatchVehicle) return
    const { error } = await apiFetch(`/rides/${selectedRide.id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ driverId: dispatchDriver, vehicleId: dispatchVehicle }),
    })
    if (error) { toast.error(error); return }
    toast.success('Viagem despachada!')
    setDispatchDialog(false)
    setRidesReload((k) => k + 1)
  }

  async function handleStatusChange() {
    if (!selectedRide || !newStatus) return
    const { error } = await apiFetch(`/rides/${selectedRide.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    })
    if (error) { toast.error(error); return }
    toast.success('Status atualizado!')
    setStatusDialog(false)
    setRidesReload((k) => k + 1)
  }

  const isManager = userRole === 'SUPER_ADMIN' || userRole === 'MANAGER'

  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'REQUESTED', label: 'Solicitadas' },
    { value: 'DISPATCHED', label: 'Despachadas' },
    { value: 'ARRIVED_AT_PICKUP', label: 'No Local' },
    { value: 'IN_PROGRESS', label: 'Em Andamento' },
    { value: 'COMPLETED', label: 'Concluídas' },
    { value: 'CANCELED', label: 'Canceladas' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((s) => (
            <Button key={s.value} size="sm" variant={statusFilter === s.value ? 'default' : 'outline'}
              onClick={() => { setStatusFilter(s.value); setPage(1) }}
              className={statusFilter === s.value ? 'bg-emerald-600' : ''}>
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Passageiro</TableHead>
                <TableHead className="hidden md:table-cell">Origem</TableHead>
                <TableHead className="hidden lg:table-cell">Destino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
              ) : rides.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Nenhuma viagem encontrada.</TableCell></TableRow>
              ) : (
                rides.map((ride) => (
                  <TableRow key={ride.id}>
                    <TableCell className="font-mono text-xs">{ride.id.slice(0, 8)}</TableCell>
                    <TableCell>{ride.passenger?.user?.name || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate">{ride.pickupAddress}</TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[200px] truncate">{ride.dropoffAddress}</TableCell>
                    <TableCell><Badge className={`text-xs ${statusColor(ride.status)}`}>{formatStatus(ride.status)}</Badge></TableCell>
                    <TableCell className="text-xs">{formatDate(ride.requestedAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {ride.status === 'REQUESTED' && isManager && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDispatch(ride)}>Despachar</Button>
                        )}
                        {ride.status !== 'COMPLETED' && ride.status !== 'CANCELED' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelectedRide(ride); setNewStatus(''); setStatusDialog(true) }}>Status</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Dispatch Dialog */}
      <Dialog open={dispatchDialog} onOpenChange={setDispatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Despachar Viagem</DialogTitle>
            <DialogDescription>Atribua um motorista e veículo para esta viagem.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Motorista</Label>
              <Select value={dispatchDriver} onValueChange={setDispatchDriver}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.user?.name || d.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Veículo</Label>
              <Select value={dispatchVehicle} onValueChange={setDispatchVehicle}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchDialog(false)}>Cancelar</Button>
            <Button onClick={handleDispatch} className="bg-emerald-600 hover:bg-emerald-700" disabled={!dispatchDriver || !dispatchVehicle}>Despachar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar Status</DialogTitle></DialogHeader>
          <div className="space-y-1">
            <Label>Novo Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DISPATCHED">Despachada</SelectItem>
                <SelectItem value="ARRIVED_AT_PICKUP">No Local de Retirada</SelectItem>
                <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                <SelectItem value="COMPLETED">Concluída</SelectItem>
                <SelectItem value="CANCELED">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>Cancelar</Button>
            <Button onClick={handleStatusChange} className="bg-emerald-600 hover:bg-emerald-700" disabled={!newStatus}>Alterar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ RULES PAGE ============
function RulesPage() {
  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'description', label: 'Descrição', render: (r: any) => r.description || '-' },
    { key: 'radiusKm', label: 'Raio (km)', render: (r: any) => r.radiusKm ? `${r.radiusKm} km` : '-' },
    { key: 'allowedDays', label: 'Dias', render: (r: any) => {
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      return (r.allowedDays || '').split(',').map((d: string) => days[parseInt(d)] || d).join(', ')
    }},
    { key: 'time', label: 'Horário', render: (r: any) => `${r.startTime || ''} - ${r.endTime || ''}` },
    { key: 'isActive', label: 'Status', render: (r: any) => <Badge className={r.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>{r.isActive ? 'Ativa' : 'Inativa'}</Badge> },
  ]

  return (
    <CrudTable<any>
      title="Regra de Disponibilidade"
      columns={columns}
      fetchData={(q) => apiFetch(`/rules${q}`)}
      createData={(body) => apiFetch('/rules', { method: 'POST', body: JSON.stringify(body) })}
      updateData={(id, body) => apiFetch(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(body) })}
      deleteData={(id) => apiFetch(`/rules/${id}`, { method: 'DELETE' })}
      renderForm={(data, onChange) => (
        <>
          <div className="space-y-1"><Label>Nome</Label><Input value={data.name || ''} onChange={(e) => onChange('name', e.target.value)} /></div>
          <div className="space-y-1"><Label>Descrição</Label><Input value={data.description || ''} onChange={(e) => onChange('description', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Latitude Centro</Label><Input type="number" step="any" value={data.centerLat || ''} onChange={(e) => onChange('centerLat', parseFloat(e.target.value) || null)} /></div>
            <div className="space-y-1"><Label>Longitude Centro</Label><Input type="number" step="any" value={data.centerLng || ''} onChange={(e) => onChange('centerLng', parseFloat(e.target.value) || null)} /></div>
          </div>
          <div className="space-y-1"><Label>Raio (km)</Label><Input type="number" value={data.radiusKm || 50} onChange={(e) => onChange('radiusKm', parseFloat(e.target.value) || 50)} /></div>
          <div className="space-y-1"><Label>Dias Permitidos (0=Dom, 1=Seg...)</Label><Input value={data.allowedDays || '1,2,3,4,5'} onChange={(e) => onChange('allowedDays', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Hora Início</Label><Input type="time" value={data.startTime || '08:00'} onChange={(e) => onChange('startTime', e.target.value)} /></div>
            <div className="space-y-1"><Label>Hora Fim</Label><Input type="time" value={data.endTime || '18:00'} onChange={(e) => onChange('endTime', e.target.value)} /></div>
          </div>
        </>
      )}
    />
  )
}

// ============ CHECKOUTS PAGE ============
function CheckoutsPage() {
  const columns = [
    { key: 'vehicle', label: 'Veículo', render: (c: any) => `${c.vehicle?.plate || '-'} (${c.vehicle?.model || ''})` },
    { key: 'driver', label: 'Motorista', render: (c: any) => c.driver?.user?.name || '-' },
    { key: 'checkedOutAt', label: 'Retirada', render: (c: any) => formatDate(c.checkedOutAt) },
    { key: 'checkedInAt', label: 'Devolução', render: (c: any) => c.checkedInAt ? formatDate(c.checkedInAt) : '-' },
    { key: 'status', label: 'Status', render: (c: any) => <Badge className={`text-xs ${statusColor(c.status)}`}>{formatStatus(c.status)}</Badge> },
  ]

  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  useEffect(() => {
    apiFetch('/vehicles?limit=100').then(({ data }) => { if (data?.data) setVehicles(data.data) })
    apiFetch('/drivers?limit=100').then(({ data }) => { if (data?.data) setDrivers(data.data) })
  }, [])

  return (
    <CrudTable<any>
      title="Checkout"
      columns={columns}
      fetchData={(q) => apiFetch(`/checkouts${q}`)}
      createData={(body) => apiFetch('/checkouts', { method: 'POST', body: JSON.stringify(body) })}
      renderForm={(data, onChange) => (
        <>
          <div className="space-y-1">
            <Label>Veículo</Label>
            <Select value={data.vehicleId || ''} onValueChange={(v) => onChange('vehicleId', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Motorista</Label>
            <Select value={data.driverId || ''} onValueChange={(v) => onChange('driverId', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.user?.name || d.id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Quilometragem Saída</Label><Input type="number" value={data.mileageOut || ''} onChange={(e) => onChange('mileageOut', parseInt(e.target.value) || null)} /></div>
          <div className="space-y-1">
            <Label>Nível Combustível Saída</Label>
            <Select value={data.fuelLevelOut || 'full'} onValueChange={(v) => onChange('fuelLevelOut', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Cheio</SelectItem>
                <SelectItem value="3/4">3/4</SelectItem>
                <SelectItem value="1/2">1/2</SelectItem>
                <SelectItem value="1/4">1/4</SelectItem>
                <SelectItem value="empty">Vazio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Observações</Label><Input value={data.notes || ''} onChange={(e) => onChange('notes', e.target.value)} /></div>
        </>
      )}
    />
  )
}

// ============ REPORTS PAGE ============
function ReportsPage() {
  const [format, setFormat] = useState('json')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('all')

  function handleExport() {
    const q = buildQuery({ format, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, status: status !== 'all' ? status : undefined })
    window.open(`/api/reports/rides${q}`, '_blank')
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Exportar Relatório de Viagens</CardTitle>
        <CardDescription>Gere relatórios operacionais em diferentes formatos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1"><Label>Data Início</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label>Data Fim</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="COMPLETED">Concluídas</SelectItem>
              <SelectItem value="CANCELED">Canceladas</SelectItem>
              <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Formato</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700">
          <Download className="w-4 h-4 mr-2" /> Exportar
        </Button>
      </CardContent>
    </Card>
  )
}

// ============ AUDIT PAGE ============
function AuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [resourceFilter, setResourceFilter] = useState('all')

  const [auditReload, setAuditReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    const q = buildQuery({ page, limit: 15, resource: resourceFilter !== 'all' ? resourceFilter : undefined })
    apiFetch(`/audit-logs${q}`).then(({ data }) => {
      if (cancelled) return
      if (data?.data) {
        setLogs(data.data)
        setTotalPages(data.pagination?.totalPages || 1)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [page, resourceFilter, auditReload])

  const resources = ['all', 'users', 'vehicles', 'drivers', 'passengers', 'cost-centers', 'rides', 'rules', 'checkouts']
  const actionColors: Record<string, string> = {
    POST: 'bg-emerald-100 text-emerald-800',
    PUT: 'bg-amber-100 text-amber-800',
    PATCH: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {resources.map((r) => (
          <Button key={r} size="sm" variant={resourceFilter === r ? 'default' : 'outline'}
            onClick={() => { setResourceFilter(r); setPage(1) }}
            className={resourceFilter === r ? 'bg-emerald-600' : ''}>
            {r === 'all' ? 'Todos' : r.charAt(0).toUpperCase() + r.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="hidden md:table-cell">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Carregando...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum log encontrado.</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                    <TableCell><Badge className={`text-xs ${actionColors[log.action] || ''}`}>{log.action}</Badge></TableCell>
                    <TableCell className="text-sm">{log.resource}</TableCell>
                    <TableCell className="text-sm">{log.user?.name || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs max-w-[200px] truncate">{log.details || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}