import { NextRequest, NextResponse } from 'next/server'
import { readForensicLog, verifyForensicChain, getForensicLogPath } from '@/lib/license'

/**
 * Admin-only endpoint to read the forensic trail.
 * Returns the chain-verified log of all tracked events.
 * This is your EVIDENCE for legal proceedings.
 * 
 * Query params:
 *   limit=N  : Return only last N entries (default: all)
 *   verify=1 : Also return chain integrity verification result
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get('limit')
  const verifyParam = searchParams.get('verify')
  const limit = limitParam ? parseInt(limitParam) : undefined

  const entries = readForensicLog(limit)

  const response: Record<string, unknown> = {
    success: true,
    data: {
      entries,
      total: entries.length,
      filePath: getForensicLogPath(),
    },
  }

  if (verifyParam === '1') {
    const verification = verifyForensicChain()
    response.data.verification = verification
  }

  return NextResponse.json(response)
}

/**
 * DELETE — Clear the forensic log.
 * CAUTION: This destroys evidence. Requires confirmation header.
 */
export async function DELETE(request: NextRequest) {
  const confirm = request.headers.get('x-confirm-purge')
  if (confirm !== 'PURGE_EVIDENCE_2024') {
    return NextResponse.json(
      { success: false, error: 'Header x-confirm-purge: PURGE_EVIDENCE_2024 required' },
      { status: 400 }
    )
  }

  try {
    const fs = require('fs')
    const path = require('path')
    const logPath = getForensicLogPath()
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath)
    }
    return NextResponse.json({ success: true, message: 'Forensic log purged' })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to purge' }, { status: 500 })
  }
}
