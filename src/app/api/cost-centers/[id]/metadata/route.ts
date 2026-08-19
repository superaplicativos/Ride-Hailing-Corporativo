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

    const costCenter = await db.costCenter.findUnique({ where: { id } })
    if (!costCenter) {
      return NextResponse.json({ success: false, error: 'Cost center not found' }, { status: 404 })
    }

    const metadata = await db.costCenterMetadata.findMany({
      where: { costCenterId: id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, data: metadata })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('List cost center metadata error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

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
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'Key and value are required' }, { status: 400 })
    }

    const costCenter = await db.costCenter.findUnique({ where: { id } })
    if (!costCenter) {
      return NextResponse.json({ success: false, error: 'Cost center not found' }, { status: 404 })
    }

    const meta = await db.costCenterMetadata.upsert({
      where: {
        costCenterId_key: { costCenterId: id, key },
      },
      update: { value },
      create: { costCenterId: id, key, value },
    })

    await auditLog({
      userId: user.sub,
      action: 'POST',
      resource: 'cost-centers/metadata',
      resourceId: id,
      details: { key, value },
      request,
    })

    return NextResponse.json({ success: true, data: meta }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Add cost center metadata error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}