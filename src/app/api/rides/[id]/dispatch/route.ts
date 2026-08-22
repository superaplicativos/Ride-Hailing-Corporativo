import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequestUser, requireRole, AuthError } from '@/lib/auth-middleware'
import { auditLog } from '@/lib/audit'
import { ROLES } from '@/types'
import { sysLog } from '@/lib/sys'

export async function POST(
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

    const checkRole = requireRole([ROLES.SUPER_ADMIN, ROLES.MANAGER])
    checkRole(user)

    const { id } = await params
    const body = await request.json()
    const { driverId, vehicleId } = body

    if (!driverId || !vehicleId) {
      return NextResponse.json(
        { success: false, error: 'driverId and vehicleId are required' },
        { status: 400 }
      )
    }

    const ride = await db.ride.findUnique({ where: { id } })
    if (!ride) {
      return NextResponse.json({ success: false, error: 'Ride not found' }, { status: 404 })
    }

    if (ride.status !== 'REQUESTED') {
      return NextResponse.json(
        { success: false, error: `Cannot dispatch a ride with status: ${ride.status}` },
        { status: 400 }
      )
    }

    const driver = await db.driver.findUnique({ where: { id: driverId } })
    if (!driver) {
      return NextResponse.json({ success: false, error: 'Driver not found' }, { status: 404 })
    }

    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 })
    }

    if (vehicle.status !== 'AVAILABLE') {
      return NextResponse.json(
        { success: false, error: `Vehicle is not available (current status: ${vehicle.status})` },
        { status: 400 }
      )
    }

    const now = new Date()

    // Update ride
    const updated = await db.ride.update({
      where: { id },
      data: {
        driverId,
        vehicleId,
        status: 'DISPATCHED',
        dispatchedAt: now,
      },
      include: {
        passenger: { select: { id: true, user: { select: { name: true, email: true } } } },
        driver: { select: { id: true, user: { select: { name: true, email: true } } } },
        vehicle: { select: { id: true, plate: true, model: true } },
        costCenter: { select: { id: true, name: true, code: true } },
      },
    })

    // Update vehicle status to EN_ROUTE
    await db.vehicle.update({
      where: { id: vehicleId },
      data: { status: 'EN_ROUTE' },
    })

    await auditLog({
      userId: user.sub,
      action: 'POST',
      resource: 'rides/dispatch',
      resourceId: id,
      details: { driverId, vehicleId },
      request,
    })

    sysLog('dispatch', request, { ride: id, driver: driverId, vehicle: vehicleId, by: user.sub })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Dispatch ride error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
