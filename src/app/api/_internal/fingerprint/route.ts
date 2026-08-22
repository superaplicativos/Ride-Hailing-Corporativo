import { NextResponse } from 'next/server'
import { generateFingerprint, getFingerprintDetails, getShortFingerprint } from '@/lib/license'

/**
 * Returns the installation fingerprint.
 * This endpoint is intentionally prefixed with _internal to be less discoverable.
 * It's used for license management and forensic identification.
 */
export async function GET() {
  return NextResponse.json({
    fingerprint: generateFingerprint(),
    short: getShortFingerprint(),
    details: getFingerprintDetails(),
  })
}
