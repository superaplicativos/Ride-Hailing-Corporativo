import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { AuditLogParams } from '@/types'

export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    const ipAddress = params.request?.headers.get('x-forwarded-for') ||
      params.request?.headers.get('x-real-ip') ||
      null
    const userAgent = params.request?.headers.get('user-agent') || null

    await db.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId || null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
