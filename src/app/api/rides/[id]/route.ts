import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequestUser, requireRole, AuthError } from '@/lib/auth-middleware'
import { auditLog } from '@/lib/audit'
import { ROLES } from '@/types'
import { RIDE_TRANSITIONS, canTransition } from '@/lib/state-machine'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const ride = await db.ride.findUnique({
      where: { id },
      include: {
        passenger: {
          select: { id: true, phone: true, user: { select: { name: true, email: true, branchId: true, branchName: true } } },
        },
        driver: {
          select: { id: true, phone: true, user: { select: { name: true, email: true } } },
        },
        vehicle: { select: { id: true, plate: true, model: true, color: true, year: true, status: true } },
        costCenter: { select: { id: true, name: true, code: true } },
      },
    })

    if (!ride) {
      return NextResponse.json({ success: false, error: 'Ride not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: ride })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Get ride error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()
    const { status, cancelReason } = body

    if (!status) {
      return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 })
    }

    const ride = await db.ride.findUnique({ where: { id } })
    if (!ride) {
      return NextResponse.json({ success: false, error: 'Ride not found' }, { status: 404 })
    }

    // Check permission: DRIVER can only update their own rides, ADMIN/MANAGER can update any
    if (user.role === ROLES.DRIVER) {
      if (ride.driverId !== user.sub) {
        return NextResponse.json({ success: false, error: 'You can only update your own rides' }, { status: 403 })
      }
    } else {
      const checkRole = requireRole([ROLES.SUPER_ADMIN, ROLES.MANAGER])
      checkRole(user)
    }

    // Validate state transition
    if (!canTransition(ride.status, status, RIDE_TRANSITIONS)) {
      return NextResponse.json(
        { success: false, error: `Invalid status transition: ${ride.status} -> ${status}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { status }

    // Set timestamps based on status
    const now = new Date()
    switch (status) {
      case 'DISPATCHED':
        updateData.dispatchedAt = now
        break
      case 'ARRIVED_AT_PICKUP':
        updateData.arrivedAt = now
        break
      case 'IN_PROGRESS':
        updateData.startedAt = now
        break
      case 'COMPLETED':
        updateData.completedAt = now
        break
      case 'CANCELED':
        updateData.canceledAt = now
        updateData.cancelReason = cancelReason || null
        break
    }

    const updated = await db.ride.update({
      where: { id },
      data: updateData,
      include: {
        passenger: { select: { id: true, user: { select: { name: true, email: true } } } },
        driver: { select: { id: true, user: { select: { name: true, email: true } } } },
        vehicle: { select: { id: true, plate: true, model: true } },
        costCenter: { select: { id: true, name: true, code: true } },
      },
    })

    await auditLog({
      userId: user.sub,
      action: 'PUT',
      resource: 'rides',
      resourceId: id,
      details: { from: ride.status, to: status, cancelReason },
      request,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Update ride error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}