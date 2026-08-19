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

    const costCenter = await db.costCenter.findUnique({
      where: { id },
      include: {
        metadata: true,
        passengers: {
          select: { id: true, user: { select: { name: true, email: true } } },
        },
        _count: { select: { rides: true, passengers: true } },
      },
    })

    if (!costCenter) {
      return NextResponse.json({ success: false, error: 'Cost center not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: costCenter })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Get cost center error:', error)
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
    const { name, code, description, isActive } = body

    const existing = await db.costCenter.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Cost center not found' }, { status: 404 })
    }

    if (code && code !== existing.code) {
      const codeExists = await db.costCenter.findUnique({ where: { code } })
      if (codeExists) {
        return NextResponse.json({ success: false, error: 'Code already in use' }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (code !== undefined) updateData.code = code
    if (description !== undefined) updateData.description = description
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await db.costCenter.update({
      where: { id },
      data: updateData,
      include: { metadata: true },
    })

    await auditLog({
      userId: user.sub,
      action: 'PUT',
      resource: 'cost-centers',
      resourceId: id,
      details: updateData,
      request,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Update cost center error:', error)
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

    const existing = await db.costCenter.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Cost center not found' }, { status: 404 })
    }

    await db.costCenter.delete({ where: { id } })

    await auditLog({
      userId: user.sub,
      action: 'DELETE',
      resource: 'cost-centers',
      resourceId: id,
      details: { deletedCode: existing.code, deletedName: existing.name },
      request,
    })

    return NextResponse.json({ success: true, message: 'Cost center deleted' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Delete cost center error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}