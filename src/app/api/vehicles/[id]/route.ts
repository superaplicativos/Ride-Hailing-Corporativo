import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequestUser, requireRole, AuthError } from '@/lib/auth-middleware'
import { auditLog } from '@/lib/audit'
import { ROLES } from '@/types'
import { VEHICLE_TRANSITIONS, canTransition } from '@/lib/state-machine'

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

    const checkRole = requireRole([ROLES.SUPER_ADMIN, ROLES.MANAGER])
    checkRole(user)

    const { id } = await params

    const vehicle = await db.vehicle.findUnique({
      where: { id },
      include: {
        metadata: true,
        currentDriver: {
          select: { id: true, user: { select: { name: true, email: true } } },
        },
      },
    })

    if (!vehicle) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: vehicle })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Get vehicle error:', error)
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

    const checkRole = requireRole([ROLES.SUPER_ADMIN, ROLES.MANAGER])
    checkRole(user)

    const { id } = await params
    const body = await request.json()
    const { plate, model, capacity, trackerId, color, year, status } = body

    const existing = await db.vehicle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 })
    }

    if (plate && plate !== existing.plate) {
      const plateExists = await db.vehicle.findUnique({ where: { plate } })
      if (plateExists) {
        return NextResponse.json({ success: false, error: 'Plate already in use' }, { status: 409 })
      }
    }

    if (status && status !== existing.status) {
      if (!canTransition(existing.status, status, VEHICLE_TRANSITIONS)) {
        return NextResponse.json(
          { success: false, error: `Invalid status transition: ${existing.status} -> ${status}` },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (plate !== undefined) updateData.plate = plate
    if (model !== undefined) updateData.model = model
    if (capacity !== undefined) updateData.capacity = capacity
    if (trackerId !== undefined) updateData.trackerId = trackerId
    if (color !== undefined) updateData.color = color
    if (year !== undefined) updateData.year = year
    if (status !== undefined) updateData.status = status

    const updated = await db.vehicle.update({
      where: { id },
      data: updateData,
      include: { metadata: true },
    })

    await auditLog({
      userId: user.sub,
      action: 'PUT',
      resource: 'vehicles',
      resourceId: id,
      details: updateData,
      request,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Update vehicle error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const existing = await db.vehicle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 })
    }

    if (existing.status === 'IN_RIDE' || existing.status === 'EN_ROUTE') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a vehicle that is currently in use' },
        { status: 400 }
      )
    }

    await db.vehicle.delete({ where: { id } })

    await auditLog({
      userId: user.sub,
      action: 'DELETE',
      resource: 'vehicles',
      resourceId: id,
      details: { plate: existing.plate },
      request,
    })

    return NextResponse.json({ success: true, message: 'Vehicle deleted' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Delete vehicle error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
