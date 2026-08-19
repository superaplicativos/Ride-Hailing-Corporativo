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
    const costCenterId = searchParams.get('costCenterId') || undefined
    const search = searchParams.get('search') || undefined

    const where: Record<string, unknown> = {}
    if (costCenterId) where.costCenterId = costCenterId
    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ]
    }

    const passengers = await db.passenger.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, branchId: true, branchName: true, isActive: true } },
        costCenter: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: passengers })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('List passengers error:', error)
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
    const { userId, phone, costCenterId } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }

    const existingUser = await db.user.findUnique({ where: { id: userId } })
    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const existingPassenger = await db.passenger.findUnique({ where: { userId } })
    if (existingPassenger) {
      return NextResponse.json({ success: false, error: 'This user already has a passenger profile' }, { status: 409 })
    }

    if (costCenterId) {
      const cc = await db.costCenter.findUnique({ where: { id: costCenterId } })
      if (!cc) {
        return NextResponse.json({ success: false, error: 'Cost center not found' }, { status: 404 })
      }
    }

    const passenger = await db.passenger.create({
      data: {
        userId,
        phone: phone || null,
        costCenterId: costCenterId || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        costCenter: { select: { id: true, name: true, code: true } },
      },
    })

    await auditLog({
      userId: user.sub,
      action: 'POST',
      resource: 'passengers',
      resourceId: passenger.id,
      details: { userId, phone, costCenterId },
      request,
    })

    return NextResponse.json({ success: true, data: passenger }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Create passenger error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
