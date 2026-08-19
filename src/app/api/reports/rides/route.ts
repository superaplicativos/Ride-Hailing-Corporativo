import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequestUser, requireRole, AuthError } from '@/lib/auth-middleware'
import { ROLES } from '@/types'
import * as XLSX from 'xlsx'

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
    const format = searchParams.get('format') || 'json'
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const status = searchParams.get('status') || undefined
    const costCenterId = searchParams.get('costCenterId') || undefined

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (costCenterId) where.costCenterId = costCenterId
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo + 'T23:59:59.999Z')
      where.requestedAt = dateFilter
    }

    const rides = await db.ride.findMany({
      where,
      include: {
        passenger: { select: { user: { select: { name: true, email: true } } } },
        driver: { select: { user: { select: { name: true, email: true } } } },
        vehicle: { select: { plate: true, model: true } },
        costCenter: { select: { name: true, code: true } },
      },
      orderBy: { requestedAt: 'desc' },
    })

    if (format === 'json') {
      return NextResponse.json({ success: true, data: rides })
    }

    // Transform for export
    const rows = rides.map((r) => ({
      'Ride ID': r.id,
      'Passenger': r.passenger.user.name,
      'Driver': r.driver?.user.name || 'N/A',
      'Vehicle': r.vehicle?.plate || 'N/A',
      'Cost Center': r.costCenter?.code || 'N/A',
      'Status': r.status,
      'Pickup Address': r.pickupAddress,
      'Dropoff Address': r.dropoffAddress,
      'Requested At': r.requestedAt.toISOString(),
      'Dispatched At': r.dispatchedAt?.toISOString() || '',
      'Completed At': r.completedAt?.toISOString() || '',
      'Canceled At': r.canceledAt?.toISOString() || '',
      'Notes': r.notes || '',
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Rides')

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=rides-report.csv',
        },
      })
    }

    // xlsx
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=rides-report.xlsx',
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Rides report error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}