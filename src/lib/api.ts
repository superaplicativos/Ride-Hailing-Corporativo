const API_BASE = '/api'

async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data.success && data.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken)
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const token = await getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      const newToken = localStorage.getItem('accessToken')
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      })
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        window.location.reload()
      }
      return { data: null, error: 'Sessão expirada', status: 401 }
    }
  }

  try {
    const json = await res.json()
    return { data: json, error: json.error || null, status: res.status }
  } catch {
    return { data: null, error: 'Erro de conexão', status: res.status }
  }
}

export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const parts: string[] = []
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`)
    }
  }
  return parts.length ? `?${parts.join('&')}` : ''
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    AVAILABLE: 'Disponível',
    EN_ROUTE: 'A Caminho',
    IN_RIDE: 'Em Viagem',
    OFFLINE: 'Offline',
    MAINTENANCE: 'Manutenção',
    REQUESTED: 'Solicitada',
    DISPATCHED: 'Despachada',
    ARRIVED_AT_PICKUP: 'No Local de Retirada',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluída',
    CANCELED: 'Cancelada',
    ACTIVE: 'Ativo',
    RETURNED: 'Devolvido',
    OFF_DUTY: 'Folga',
  }
  return map[status] || status
}

export function statusColor(status: string): string {
 const map: Record<string, string> = {
    AVAILABLE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    EN_ROUTE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    IN_RIDE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    OFFLINE: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    MAINTENANCE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    REQUESTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    DISPATCHED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    ARRIVED_AT_PICKUP: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    CANCELED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    RETURNED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    OFF_DUTY: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  }
  return map[status] || 'bg-gray-100 text-gray-800'
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'Super Administrador',
    MANAGER: 'Gerente',
    DRIVER: 'Motorista',
    PASSENGER: 'Passageiro',
  }
  return map[role] || role
}

export function roleColor(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    DRIVER: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    PASSENGER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  }
  return map[role] || 'bg-gray-100 text-gray-800'
}
