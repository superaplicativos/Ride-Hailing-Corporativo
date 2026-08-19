import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequestUser, requireRole, AuthError } from '@/lib/auth-middleware'
import { auditLog } from '@/lib/audit'
import { ROLES } from '@/types'

export async function GET(request: NextRequest) {
  try {
    let user
    try {
      user = getRequestUser(request)
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ success: false, error: e.message }, { status: e.statusCode })
      }
      throw e
    }

    const checkRole = requireRole([ROLES.SUPER_ADMIN])
    checkRole(user)

    const rules = await db.availabilityRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: rules })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('List rules error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    let user
    try {
      user = getRequestUser(request)
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ success: false, error: e.message }, { status: e.statusCode })
      }
      throw e
    }

    const checkRole = requireRole([ROLES.SUPER_ADMIN])
    checkRole(user)

    const body = await request.json()
    const { name, description, centerLat, centerLng, radiusKm, allowedDays, startTime, endTime } = body

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })
    }

    const rule = await db.availabilityRule.create({
      data: {
        name,
        description: description || null,
        centerLat: centerLat ?? null,
        centerLng: centerLng ?? null,
        radiusKm: radiusKm ?? 50,
        allowedDays: allowedDays || '1,2,3,4,5',
        startTime: startTime || '08:00',
        endTime: endTime || '18:00',
      },
    })

    await auditLog({
      userId: user.sub,
      action: 'POST',
      resource: 'rules',
      resourceId: rule.id,
      details: { name, centerLat, centerLng, radiusKm, allowedDays, startTime, endTime },
      request,
    })

    return NextResponse.json({ success: true, data: rule }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Create rule error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}