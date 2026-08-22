import { NextResponse } from 'next/server'
import { getTrackerStatus, flushAllEvents } from '@/lib/license'

/**
 * Returns the current status of the license tracking system.
 * Useful for verifying that phone-home is working.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: getTrackerStatus(),
  })
}

/**
 * Force-flush all queued tracking events.
 */
export async function POST() {
  await flushAllEvents()
  return NextResponse.json({ success: true, message: 'Events flushed' })
}
