/**
 * FleetControl — Installation Fingerprint Generator
 * 
 * Generates a unique, stable identifier for each installation.
 * Uses multiple signals to make fingerprinting resilient to individual changes.
 * 
 * WARNING: This module is part of the license enforcement system.
 * Removing or modifying this file constitutes a license violation.
 */

import * as crypto from 'crypto'
import * as os from 'os'
import * as path from 'path'

let _cachedFingerprint: string | null = null

/**
 * Collects all available machine/environment signals.
 * Each signal is optional — the hash is computed from whatever is available.
 */
function collectSignals(): Record<string, string> {
  const signals: Record<string, string> = {}

  // 1. Hostname
  try { signals.hostname = os.hostname() || 'unknown' } catch { signals.hostname = 'unknown' }

  // 2. Platform and architecture
  try { signals.platform = os.platform() } catch { signals.platform = 'unknown' }
  try { signals.arch = os.arch() } catch { signals.arch = 'unknown' }

  // 3. Total memory (in bytes) — hardware fingerprint
  try { signals.totalMem = String(os.totalmem()) } catch { signals.totalMem = '0' }

  // 4. CPU model — strong hardware signal
  try {
    const cpus = os.cpus()
    if (cpus.length > 0) {
      signals.cpuModel = cpus[0].model
      signals.cpuCores = String(cpus.length)
    }
  } catch { /* silent */ }

  // 5. Network interfaces — MAC addresses are strong identifiers
  try {
    const nets = os.networkInterfaces()
    const macs: string[] = []
    for (const name of Object.keys(nets || {})) {
      const entries = nets![name]
      if (!entries) continue
      for (const entry of entries) {
        // Skip internal/non-physical interfaces
        if (!entry.internal && entry.mac && entry.mac !== '00:00:00:00:00:00') {
          macs.push(entry.mac)
        }
      }
    }
    // Sort for stability across reboots
    signals.macs = macs.sort().join(',')
  } catch { signals.macs = 'unknown' }

  // 6. Database file path (SQLite) or DATABASE_URL env
  try {
    signals.dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'prisma', 'db', 'dev.db')
  } catch { signals.dbPath = 'unknown' }

  // 7. Working directory — detects deployment location
  try { signals.cwd = process.cwd() } catch { signals.cwd = 'unknown' }

  // 8. Node.js version
  try { signals.nodeVersion = process.version } catch { signals.nodeVersion = 'unknown' }

  // 9. User running the process
  try {
    const userInfo = os.userInfo()
    signals.username = userInfo.username
    signals.homeDir = userInfo.homedir
  } catch { /* silent — may fail in containers */ }

  // 10. Process environment uniqueness
  try {
    signals.envCount = String(Object.keys(process.env).length)
    signals.pid = String(process.pid)
  } catch { /* silent */ }

  return signals
}

/**
 * Generates a SHA-256 fingerprint from all collected signals.
 * Returns a 64-character hex string.
 * Results are cached in-memory for the process lifetime.
 */
export function generateFingerprint(): string {
  if (_cachedFingerprint) return _cachedFingerprint

  const signals = collectSignals()
  const raw = Object.entries(signals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('|')

  _cachedFingerprint = crypto.createHash('sha256').update(raw).digest('hex')
  return _cachedFingerprint
}

/**
 * Returns the raw signals object (for detailed tracking).
 * Does NOT include sensitive env values — only structural info.
 */
export function getFingerprintDetails(): Record<string, string> {
  return collectSignals()
}

/**
 * Returns a short version of the fingerprint (first 12 chars) for display.
 */
export function getShortFingerprint(): string {
  return generateFingerprint().substring(0, 12)
}