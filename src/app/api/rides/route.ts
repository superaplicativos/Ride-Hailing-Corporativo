import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequestUser, requireRole, AuthError } from '@/lib/auth-middleware'
import { auditLog } from '@/lib/audit'
import { ROLES } from '@/types'
import { validateRideRequest } from '@/lib/geofencing'
import { licenseGuard, trackConfigChange } from '@/lib/license'

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status') || undefined
    const passengerId = searchParams.get('passengerId') || undefined
    const driverId = searchParams.get('driverId') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (passengerId) where.passengerId = passengerId
    if (driverId) where.driverId = driverId
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo + 'T23:59:59.999Z')
      where.requestedAt = dateFilter
    }

    const [rides, total] = await Promise.all([
      db.ride.findMany({
        where,
        include: {
          passenger: {
            select: { id: true, user: { select: { name: true, email: true } } },
          },
          driver: {
            select: { id: true, user: { select: { name: true, email: true } } },
          },
          vehicle: { select: { id: true, plate: true, model: true } },
          costCenter: { select: { id: true, name: true, code: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.ride.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: rides,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('List rides error:', error)
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

    const body = await request.json()
    const {
      passengerId, pickupAddress, pickupLat, pickupLng,
      dropoffAddress, dropoffLat, dropoffLng, costCenterId, notes,
    } = body

    if (!passengerId || !pickupAddress || pickupLat == null || pickupLng == null ||
        !dropoffAddress || dropoffLat == null || dropoffLng == null) {
      return NextResponse.json(
        { success: false, error: 'passengerId, pickupAddress, pickupLat, pickupLng, dropoffAddress, dropoffLat, dropoffLng are required' },
        { status: 400 }
      )
    }

    const passenger = await db.passenger.findUnique({ where: { id: passengerId } })
    if (!passenger) {
      return NextResponse.json({ success: false, error: 'Passenger not found' }, { status: 404 })
    }

    if (costCenterId) {
      const cc = await db.costCenter.findUnique({ where: { id: costCenterId } })
      if (!cc) {
        return NextResponse.json({ success: false, error: 'Cost center not found' }, { status: 404 })
      }
    }

    // License check on ride creation
    const license = await licenseGuard(request, { id: user.sub, role: user.role }, 'ride_create')
    if (license.degradationLevel >= 3) {
      return NextResponse.json({
        success: false,
        error: 'Sistema temporariamente indisponível. Tente novamente em instantes.',
      }, { status: 503 })
    }

    // Validate availability rules
    const rules = await db.availabilityRule.findMany({ where: { isActive: true } })
    const validation = validateRideRequest(pickupLat, pickupLng, rules)
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.reason }, { status: 400 })
    }

    const ride = await db.ride.create({
      data: {
        passengerId,
        pickupAddress,
        pickupLat,
        pickupLng,
        dropoffAddress,
        dropoffLat,
        dropoffLng,
        costCenterId: costCenterId || null,
        notes: notes || null,
      },
      include: {
        passenger: { select: { id: true, user: { select: { name: true, email: true } } } },
        costCenter: { select: { id: true, name: true, code: true } },
      },
    })

    await auditLog({
      userId: user.sub,
      action: 'POST',
      resource: 'rides',
      resourceId: ride.id,
      details: { passengerId, pickupAddress, dropoffAddress, costCenterId },
      request,
    })

    trackConfigChange(user.sub, 'rides', 'create')

    return NextResponse.json({ success: true, data: ride }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Create ride error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
