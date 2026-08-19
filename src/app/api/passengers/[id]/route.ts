import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequestUser, requireRole, AuthError } from '@/lib/auth-middleware'
import { auditLog } from '@/lib/audit'
import { ROLES } from '@/types'

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

    const passenger = await db.passenger.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, branchId: true, branchName: true, isActive: true } },
        costCenter: { select: { id: true, name: true, code: true } },
        rides: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    })

    if (!passenger) {
      return NextResponse.json({ success: false, error: 'Passenger not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: passenger })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Get passenger error:', error)
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
    const { phone, costCenterId } = body

    const existing = await db.passenger.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Passenger not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (phone !== undefined) updateData.phone = phone
    if (costCenterId !== undefined) updateData.costCenterId = costCenterId || null

    const updated = await db.passenger.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        costCenter: { select: { id: true, name: true, code: true } },
      },
    })

    await auditLog({
      userId: user.sub,
      action: 'PUT',
      resource: 'passengers',
      resourceId: id,
      details: updateData,
      request,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Update passenger error:', error)
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

    const existing = await db.passenger.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Passenger not found' }, { status: 404 })
    }

    await db.passenger.delete({ where: { id } })

    await auditLog({
      userId: user.sub,
      action: 'DELETE',
      resource: 'passengers',
      resourceId: id,
      details: { deletedPassengerUserId: existing.userId },
      request,
    })

    return NextResponse.json({ success: true, message: 'Passenger deleted' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Delete passenger error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}