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
    const vehicleId = searchParams.get('vehicleId') || undefined
    const driverId = searchParams.get('driverId') || undefined

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (vehicleId) where.vehicleId = vehicleId
    if (driverId) where.driverId = driverId

    const checkouts = await db.vehicleCheckout.findMany({
      where,
      include: {
        vehicle: { select: { id: true, plate: true, model: true, color: true } },
        driver: {
          select: { id: true, user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { checkedOutAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: checkouts })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('List checkouts error:', error)
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
    const { vehicleId, driverId, mileageOut, fuelLevelOut, notes } = body

    if (!vehicleId || !driverId) {
      return NextResponse.json({ success: false, error: 'vehicleId and driverId are required' }, { status: 400 })
    }

    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 })
    }

    const driver = await db.driver.findUnique({ where: { id: driverId } })
    if (!driver) {
      return NextResponse.json({ success: false, error: 'Driver not found' }, { status: 404 })
    }

    // Check if vehicle is already checked out
    const activeCheckout = await db.vehicleCheckout.findFirst({
      where: { vehicleId, status: 'ACTIVE' },
    })
    if (activeCheckout) {
      return NextResponse.json(
        { success: false, error: 'Vehicle is already checked out' },
        { status: 409 }
      )
    }

    const checkout = await db.vehicleCheckout.create({
      data: {
        vehicleId,
        driverId,
        mileageOut: mileageOut || null,
        fuelLevelOut: fuelLevelOut || 'full',
        notes: notes || null,
      },
      include: {
        vehicle: { select: { id: true, plate: true, model: true } },
        driver: { select: { id: true, user: { select: { name: true, email: true } } } },
      },
    })

    await auditLog({
      userId: user.sub,
      action: 'POST',
      resource: 'checkouts',
      resourceId: checkout.id,
      details: { vehicleId, driverId, mileageOut, fuelLevelOut },
      request,
    })

    return NextResponse.json({ success: true, data: checkout }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Create checkout error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
