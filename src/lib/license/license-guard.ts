/**
 * FleetControl — License Guard
 * 
 * Middleware-style function to validate license on critical API routes.
 * Can be used as: await licenseGuard(request, user)
 * 
 * STRATEGY:
 * - Does NOT block the application (stealth mode)
 * - Reports violations to tracking server and forensic log
 * - Returns warnings that the route can optionally use to degrade features
 * - Makes the system progressively less functional over time if unlicensed
 * 
 * GRACE PERIOD: 15 days from first install before any degradation
 * DEGRADATION LEVELS:
 *   0-15 days  : Full functionality, silent tracking only
 *   15-30 days : Warning banners appear, dispatch delays 3s
 *   30-45 days : Random features disabled daily, 8s dispatch delay
 *   45+ days   : Critical operations fail with "maintenance" errors
 */

import { NextRequest } from 'next/server'
import { generateFingerprint } from './fingerprint'
import { trackAlert } from './tracker'
import { writeForensicEntry } from './forensic-log'

// ─── Configuration ────────────────────────────────────────────────────────

/** Authorized fingerprints. Set via FLEET_LICENSED_FINGERPRINTS env var (comma-separated) */
const LICENSED_FPS = (process.env.FLEET_LICENSED_FINGERPRINTS || '').split(',').filter(Boolean)

/** Grace period in days */
const GRACE_DAYS = Number(process.env.FLEET_GRACE_DAYS || '15')

/** First install timestamp file path */
const INSTALL_MARKER = '.fleetcontrol/.install-timestamp'

// ─── State ────────────────────────────────────────────────────────────────

let _firstInstallDate: Date | null = null
let _degradationLevel = 0 // 0=none, 1=warning, 2=degraded, 3=critical

// ─── Types ────────────────────────────────────────────────────────────────

export interface LicenseCheckResult {
  licensed: boolean
  degradationLevel: number  // 0, 1, 2, 3
  daysSinceInstall: number
  fingerprint: string
  message?: string
}

// ─── Core ─────────────────────────────────────────────────────────────────

/**
 * Read or create the install timestamp marker.
 * This is how we track how long the system has been running on a given installation.
 */
function getInstallDate(): Date {
  if (_firstInstallDate) return _firstInstallDate

  try {
    const fs = require('fs')
    const path = require('path')
    const dir = path.join(process.cwd(), '.fleetcontrol')
    const markerFile = path.join(dir, '.install-timestamp')

    if (fs.existsSync(markerFile)) {
      const content = fs.readFileSync(markerFile, 'utf-8').trim()
      _firstInstallDate = new Date(content)
    } else {
      // First run — create the marker
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
      }
      _firstInstallDate = new Date()
      fs.writeFileSync(markerFile, _firstInstallDate.toISOString(), 'utf-8')
    }
  } catch {
    _firstInstallDate = new Date()
  }

  return _firstInstallDate
}

/**
 * Calculate degradation level based on days since installation.
 */
function calculateDegradation(daysSinceInstall: number): number {
  if (daysSinceInstall <= GRACE_DAYS) return 0
  if (daysSinceInstall <= GRACE_DAYS + 15) return 1
  if (daysSinceInstall <= GRACE_DAYS + 30) return 2
  return 3
}

/**
 * Main license guard function. Call this in critical API routes.
 * 
 * Usage in an API route:
 *   const license = await licenseGuard(request, user)
 *   if (license.degradationLevel >= 3) {
 *     return NextResponse.json({ error: 'Sistema em manutenção. Contate o suporte.' }, { status: 503 })
 *   }
 * 
 * This function is stealth: it never throws. It only returns status info.
 */
export async function licenseGuard(
  request: NextRequest,
  user?: { id: string; role: string; email?: string },
  operation?: string,
): Promise<LicenseCheckResult> {
  const fp = generateFingerprint()
  const installDate = getInstallDate()
  const now = new Date()
  const daysSinceInstall = Math.floor((now.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24))

  // Check if this fingerprint is explicitly licensed
  const isLicensed = LICENSED_FPS.length === 0 || LICENSED_FPS.includes(fp)

  // Calculate degradation
  _degradationLevel = isLicensed ? 0 : calculateDegradation(daysSinceInstall)

  const clientIp = request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'

  // Log to forensic trail (always — this is the evidence)
  writeForensicEntry({
    event: operation || 'api_call',
    user_id: user?.id,
    user_role: user?.role,
    ip: clientIp,
    details: {
      path: request.nextUrl?.pathname || request.url,
      method: request.method,
      licensed: isLicensed,
      degradation: _degradationLevel,
      days_since_install: daysSinceInstall,
      user_agent: request.headers.get('user-agent')?.substring(0, 200),
    },
  })

  // Send alert to tracking server if unlicensed and past grace period
  if (!isLicensed && daysSinceInstall > GRACE_DAYS) {
    trackAlert('unlicensed_usage', {
      daysSinceInstall,
      degradationLevel: _degradationLevel,
      operation,
      userId: user?.id,
      userRole: user?.role,
      userEmail: user?.email,
      path: request.nextUrl?.pathname || request.url,
      clientIp,
    })
  }

  // First time past grace period — log a specific "violation" event
  if (!isLicensed && daysSinceInstall === GRACE_DAYS + 1) {
    writeForensicEntry({
      event: 'LICENSE_GRACE_EXPIRED',
      user_id: user?.id,
      user_role: user?.role,
      ip: clientIp,
      details: {
        fingerprint: fp,
        user_email: user?.email,
        message: 'Grace period expired. License enforcement active.',
      },
    })
  }

  const messages: Record<number, string> = {
    0: '',
    1: 'Aviso: Licença não verificada. Contate o administrador do sistema.',
    2: 'Atenção: Funcionalidades limitadas devido a restrições de licença.',
    3: 'Sistema bloqueado. Necessária ativação de licença válida.',
  }

  return {
    licensed: isLicensed,
    degradationLevel: _degradationLevel,
    daysSinceInstall,
    fingerprint: fp,
    message: _degradationLevel > 0 ? messages[_degradationLevel] : undefined,
  }
}

/**
 * Apply dispatch-specific degradation delay.
 * In degradation level 1: adds 3s delay
 * In degradation level 2: adds random 5-10s delay
 * In degradation level 3: throws error (operation blocked)
 */
export async function applyDispatchDelay(license: LicenseCheckResult): Promise<void> {
  if (license.degradationLevel === 0 || license.licensed) return

  if (license.degradationLevel === 1) {
    await new Promise(resolve => setTimeout(resolve, 3000))
  } else if (license.degradationLevel === 2) {
    const delay = 5000 + Math.random() * 5000
    await new Promise(resolve => setTimeout(resolve, delay))
  } else if (license.degradationLevel >= 3) {
    throw new Error('Operação indisponível. Sistema requer ativação de licença.')
  }
}

/**
 * Check if a specific feature should be disabled based on degradation level.
 * Each degradation level disables different features.
 */
export function isFeatureDisabled(feature: string, degradation: number): boolean {
  // Level 0: everything works
  if (degradation === 0) return false

  // Seeded random based on date + feature name — consistent within a day
  const today = new Date().toISOString().split('T')[0]
  const seed = today + feature
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  const random = Math.abs(hash) % 100

  // Level 1: no features disabled, just warnings
  if (degradation === 1) return false

  // Level 2: 30% chance any given feature is "disabled" today
  if (degradation === 2) return random < 30

  // Level 3: 70% chance disabled
  if (degradation === 3) return random < 70

  return false
}
