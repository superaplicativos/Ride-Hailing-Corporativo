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

    const driver = await db.driver.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, branchId: true, branchName: true, isActive: true } },
        currentVehicle: { select: { id: true, plate: true, model: true, status: true, color: true, year: true } },
        rides: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    })

    if (!driver) {
      return NextResponse.json({ success: false, error: 'Driver not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: driver })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Get driver error:', error)
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
    const { licenseNumber, licenseExpiry, phone, status, currentVehicleId } = body

    const existing = await db.driver.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Driver not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber
    if (licenseExpiry !== undefined) updateData.licenseExpiry = licenseExpiry ? new Date(licenseExpiry) : null
    if (phone !== undefined) updateData.phone = phone
    if (status !== undefined) updateData.status = status
    if (currentVehicleId !== undefined) updateData.currentVehicleId = currentVehicleId || null

    const updated = await db.driver.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        currentVehicle: { select: { id: true, plate: true, model: true, status: true } },
      },
    })

    await auditLog({
      userId: user.sub,
      action: 'PUT',
      resource: 'drivers',
      resourceId: id,
      details: updateData,
      request,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Update driver error:', error)
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

    const existing = await db.driver.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Driver not found' }, { status: 404 })
    }

    await db.driver.delete({ where: { id } })

    await auditLog({
      userId: user.sub,
      action: 'DELETE',
      resource: 'drivers',
      resourceId: id,
      details: { deletedDriverUserId: existing.userId },
      request,
    })

    return NextResponse.json({ success: true, message: 'Driver deleted' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Delete driver error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
