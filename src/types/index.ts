import { NextRequest } from 'next/server'

// ============ JWT Payload ============
export interface JwtPayload {
  sub: string
  email: string
  name: string
  role: string
  branchId: string | null
  branchName: string | null
  iat?: number
  exp?: number
}

// ============ User ============
export interface UserInfo {
  id: string
  email: string
  name: string
  role: string
  branchId: string | null
  branchName: string | null
}

// ============ API Response ============
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============ Roles ============
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MANAGER: 'MANAGER',
  DRIVER: 'DRIVER',
  PASSENGER: 'PASSENGER',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// ============ Vehicle Status ============
export const VEHICLE_STATUS = {
  AVAILABLE: 'AVAILABLE',
  EN_ROUTE: 'EN_ROUTE',
  IN_RIDE: 'IN_RIDE',
  OFFLINE: 'OFFLINE',
  MAINTENANCE: 'MAINTENANCE',
} as const

export type VehicleStatus = (typeof VEHICLE_STATUS)[keyof typeof VEHICLE_STATUS]

// ============ Ride Status ============
export const RIDE_STATUS = {
  REQUESTED: 'REQUESTED',
  DISPATCHED: 'DISPATCHED',
  ARRIVED_AT_PICKUP: 'ARRIVED_AT_PICKUP',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
} as const

export type RideStatus = (typeof RIDE_STATUS)[keyof typeof RIDE_STATUS]

// ============ Audit ============
export interface AuditLogParams {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  details?: unknown
  request?: NextRequest
}

// ============ Metadata ============
export interface MetadataEntry {
  key: string
  value: string
}
