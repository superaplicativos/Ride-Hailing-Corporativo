import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getRequestUser, AuthError } from '@/lib/auth-middleware'

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

    const [totalUsers, totalVehicles, totalDrivers, totalRides, activeVehicles, ridesByStatusRaw] =
      await Promise.all([
        db.user.count(),
        db.vehicle.count(),
        db.driver.count(),
        db.ride.count(),
        db.vehicle.count({ where: { status: 'AVAILABLE' } }),
        db.ride.groupBy({ by: ['status'], _count: { status: true } }),
      ])

    const ridesByStatus: Record<string, number> = {}
    for (const r of ridesByStatusRaw) {
      ridesByStatus[r.status] = r._count.status
    }

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalVehicles,
        totalDrivers,
        totalRides,
        ridesByStatus,
        activeVehicles,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error('Metrics error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
