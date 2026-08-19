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
    const search = searchParams.get('search') || undefined

    const where: Record<string, unknown> = { isActive: true }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ]
    }

    const costCenters = await db.costCenter.findMany({
      where,
      include: {
        metadata: true,
        _count: { select: { passengers: true, rides: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: costCenters })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('List cost centers error:', error)
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
    const { name, code, description, metadata } = body

    if (!name || !code) {
      return NextResponse.json({ success: false, error: 'Name and code are required' }, { status: 400 })
    }

    const existing = await db.costCenter.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'A cost center with this code already exists' }, { status: 409 })
    }

    const costCenter = await db.costCenter.create({
      data: {
        name,
        code,
        description: description || null,
        metadata: metadata
          ? {
              create: metadata.map((m: { key: string; value: string }) => ({
                key: m.key,
                value: m.value,
              })),
            }
          : undefined,
      },
      include: { metadata: true },
    })

    await auditLog({
      userId: user.sub,
      action: 'POST',
      resource: 'cost-centers',
      resourceId: costCenter.id,
      details: { name, code, description },
      request,
    })

    return NextResponse.json({ success: true, data: costCenter }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Create cost center error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
