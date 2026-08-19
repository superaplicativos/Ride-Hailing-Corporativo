import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequestUser, requireRole, AuthError } from '@/lib/auth-middleware'
import { auditLog } from '@/lib/audit'
import { ROLES } from '@/types'

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
    const { mileageIn, fuelLevelIn, notes } = body

    const checkout = await db.vehicleCheckout.findUnique({ where: { id } })
    if (!checkout) {
      return NextResponse.json({ success: false, error: 'Checkout not found' }, { status: 404 })
    }

    if (checkout.status === 'RETURNED') {
      return NextResponse.json({ success: false, error: 'This checkout has already been returned' }, { status: 400 })
    }

    const updated = await db.vehicleCheckout.update({
      where: { id },
      data: {
        checkedInAt: new Date(),
        mileageIn: mileageIn || null,
        fuelLevelIn: fuelLevelIn || null,
        notes: notes || checkout.notes,
        status: 'RETURNED',
      },
      include: {
        vehicle: { select: { id: true, plate: true, model: true } },
        driver: { select: { id: true, user: { select: { name: true, email: true } } } },
      },
    })

    await auditLog({
      userId: user.sub,
      action: 'POST',
      resource: 'checkouts/return',
      resourceId: id,
      details: { mileageIn, fuelLevelIn, checkoutVehicleId: checkout.vehicleId },
      request,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Return checkout error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}