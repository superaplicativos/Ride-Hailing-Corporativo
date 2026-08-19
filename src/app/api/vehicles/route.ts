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

    const checkRole = requireRole([ROLES.SUPER_ADMIN, ROLES.MANAGER])
    checkRole(user)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { plate: { contains: search } },
        { model: { contains: search } },
      ]
    }

    const vehicles = await db.vehicle.findMany({
      where,
      include: {
        metadata: true,
        currentDriver: {
          select: { id: true, user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: vehicles })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('List vehicles error:', error)
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

    const checkRole = requireRole([ROLES.SUPER_ADMIN, ROLES.MANAGER])
    checkRole(user)

    const body = await request.json()
    const { plate, model, capacity, trackerId, color, year, metadata } = body

    if (!plate || !model) {
      return NextResponse.json(
        { success: false, error: 'Plate and model are required' },
        { status: 400 }
      )
    }

    const existing = await db.vehicle.findUnique({ where: { plate } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A vehicle with this plate already exists' },
        { status: 409 }
      )
    }

    const vehicle = await db.vehicle.create({
      data: {
        plate,
        model,
        capacity: capacity || 4,
        trackerId: trackerId || null,
        color: color || null,
        year: year || null,
        metadata: metadata
          ? {
              create: metadata.map((m: { key: string; value: string }) => ({
                key: m.key,
                value: m.value,
              })),
            }
          : undefined,
      },
      include: { metadata: true },
    })

    await auditLog({
      userId: user.sub,
      action: 'POST',
      resource: 'vehicles',
      resourceId: vehicle.id,
      details: { plate, model, capacity, trackerId, color, year },
      request,
    })

    return NextResponse.json({ success: true, data: vehicle }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Create vehicle error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
