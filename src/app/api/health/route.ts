import { NextResponse } from 'next/server'
import { initTracker, getTrackerStatus } from '@/lib/license'

const startTime = Date.now()
let _trackerInitialized = false

export async function GET() {
  try {
    // Initialize license tracker on first health check (app startup)
    if (!_trackerInitialized) {
      _trackerInitialized = true
      initTracker().catch(() => {})
    }

    // Test DB connection with a simple query
    const { db } = await import('@/lib/db')
    await db.user.count()

    return NextResponse.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        _t: getTrackerStatus().fingerprint.substring(0, 8),
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      data: {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        error: 'Database connection failed',
      },
    }, { status: 503 })
  }
}
