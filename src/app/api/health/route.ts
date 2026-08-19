import { NextResponse } from 'next/server'

const startTime = Date.now()

export async function GET() {
  try {
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
