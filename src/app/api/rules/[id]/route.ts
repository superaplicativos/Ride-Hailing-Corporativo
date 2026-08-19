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

    const checkRole = requireRole([ROLES.SUPER_ADMIN])
    checkRole(user)

    const { id } = await params

    const rule = await db.availabilityRule.findUnique({ where: { id } })
    if (!rule) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: rule })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Get rule error:', error)
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

    const checkRole = requireRole([ROLES.SUPER_ADMIN])
    checkRole(user)

    const { id } = await params
    const body = await request.json()
    const { name, description, centerLat, centerLng, radiusKm, allowedDays, startTime, endTime, isActive } = body

    const existing = await db.availabilityRule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (centerLat !== undefined) updateData.centerLat = centerLat
    if (centerLng !== undefined) updateData.centerLng = centerLng
    if (radiusKm !== undefined) updateData.radiusKm = radiusKm
    if (allowedDays !== undefined) updateData.allowedDays = allowedDays
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await db.availabilityRule.update({
      where: { id },
      data: updateData,
    })

    await auditLog({
      userId: user.sub,
      action: 'PUT',
      resource: 'rules',
      resourceId: id,
      details: updateData,
      request,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Update rule error:', error)
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

    const checkRole = requireRole([ROLES.SUPER_ADMIN])
    checkRole(user)

    const { id } = await params

    const existing = await db.availabilityRule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 })
    }

    await db.availabilityRule.delete({ where: { id } })

    await auditLog({
      userId: user.sub,
      action: 'DELETE',
      resource: 'rules',
      resourceId: id,
      details: { deletedRuleName: existing.name },
      request,
    })

    return NextResponse.json({ success: true, message: 'Rule deleted' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Delete rule error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}