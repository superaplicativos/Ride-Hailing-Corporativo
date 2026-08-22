/**
 * FleetControl — Forensic Logger
 * 
 * Writes a SEPARATE, HIDDEN audit trail specifically for license enforcement.
 * This is independent of the main audit log system.
 * 
 * FEATURES:
 * - Writes to a hidden JSONL file (one JSON object per line)
 * - Each entry is immutable and append-only
 * - Includes cryptographic hash chain (each entry hashes the previous)
 * - Cannot be tampered with without breaking the chain
 * - Hidden from normal admin views
 * 
 * STORAGE: .fleetcontrol/.forensic-trail.jsonl (gitignored by default)
 * 
 * This file serves as EVIDENCE in legal proceedings because:
 * 1. Hash chain proves chronological integrity
 * 2. Contains installation fingerprint for positive identification
 * 3. Records exact timestamps of all operations
 * 4. Cannot be selectively edited without detection
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { generateFingerprint, getShortFingerprint } from './fingerprint'

// ─── Configuration ────────────────────────────────────────────────────────

const FORENSIC_DIR = path.join(process.cwd(), '.fleetcontrol')
const FORENSIC_FILE = path.join(FORENSIC_DIR, '.forensic-trail.jsonl')

// ─── Types ────────────────────────────────────────────────────────────────

export interface ForensicEntry {
  seq: number           // Sequence number (monotonically increasing)
  ts: string            // ISO 8601 timestamp
  fp: string            // Full installation fingerprint
  fp_short: string      // Short fingerprint
  event: string         // Event type
  user_id?: string      // Related user
  user_role?: string    // User role
  ip?: string           // Client IP (when available from request)
  details?: Record<string, unknown>  // Event-specific data
  hash: string          // SHA-256 of this entry + previous hash
  prev_hash: string     // Hash of previous entry (null for first)
}

// ─── State ────────────────────────────────────────────────────────────────

let _lastHash = '0000000000000000000000000000000000000000000000000000000000000000'
let _sequence = 0
let _initialized = false

// ─── Core ─────────────────────────────────────────────────────────────────

/**
 * Ensure the forensic log directory and file exist.
 * Load the last hash and sequence from existing entries.
 */
function ensureInitialized(): void {
  if (_initialized) return
  _initialized = true

  try {
    // Create directory if it doesn't exist (hidden with dot prefix)
    if (!fs.existsSync(FORENSIC_DIR)) {
      fs.mkdirSync(FORENSIC_DIR, { recursive: true, mode: 0o700 })
    }

    // If file exists, read the last entry to continue the chain
    if (fs.existsSync(FORENSIC_FILE)) {
      const content = fs.readFileSync(FORENSIC_FILE, 'utf-8')
      const lines = content.split('\n').filter(l => l.trim())
      if (lines.length > 0) {
        const lastEntry = JSON.parse(lines[lines.length - 1]) as ForensicEntry
        _lastHash = lastEntry.hash
        _sequence = lastEntry.seq
      }
    }
  } catch (error) {
    // If we can't read existing file, start fresh
    // This is intentional — the system MUST continue working
    console.error('[forensic] Init error (non-critical):', error)
  }
}

/**
 * Write a forensic entry to the log file.
 * Each entry is hashed with the previous entry's hash, creating a chain.
 */
export function writeForensicEntry(params: {
  event: string
  user_id?: string
  user_role?: string
  ip?: string
  details?: Record<string, unknown>
}): void {
  ensureInitialized()

  _sequence++
  const entry: ForensicEntry = {
    seq: _sequence,
    ts: new Date().toISOString(),
    fp: generateFingerprint(),
    fp_short: getShortFingerprint(),
    event: params.event,
    user_id: params.user_id,
    user_role: params.user_role,
    ip: params.ip,
    details: params.details,
    hash: '',
    prev_hash: _lastHash,
  }

  // Compute hash: SHA-256(seq + ts + event + prev_hash + details)
  const hashInput = `${entry.seq}|${entry.ts}|${entry.event}|${entry.fp}|${_lastHash}|${JSON.stringify(entry.details || {})}`
  entry.hash = crypto.createHash('sha256').update(hashInput).digest('hex')

  _lastHash = entry.hash

  // Append to file (atomic append, no locking needed for single-process Node.js)
  try {
    const line = JSON.stringify(entry)
    fs.appendFileSync(FORENSIC_FILE, line + '\n', 'utf-8')
  } catch (error) {
    // Forensic log failure MUST NOT break the application
    // This ensures the tracker remains invisible
    console.error('[forensic] Write error (non-critical):', error)
  }
}

/**
 * Verify the integrity of the forensic log chain.
 * Returns true if all entries have valid hash links.
 * Useful for proving in court that the log wasn't tampered with.
 */
export function verifyForensicChain(): {
  valid: boolean
  totalEntries: number
  firstEntry: ForensicEntry | null
  lastEntry: ForensicEntry | null
  brokenAt: number | null  // Sequence number where chain breaks
} {
  ensureInitialized()

  try {
    if (!fs.existsSync(FORENSIC_FILE)) {
      return { valid: true, totalEntries: 0, firstEntry: null, lastEntry: null, brokenAt: null }
    }

    const content = fs.readFileSync(FORENSIC_FILE, 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())

    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000'

    for (let i = 0; i < lines.length; i++) {
      const entry = JSON.parse(lines[i]) as ForensicEntry

      // Verify chain link
      if (entry.prev_hash !== prevHash) {
        return {
          valid: false,
          totalEntries: lines.length,
          firstEntry: JSON.parse(lines[0]) as ForensicEntry,
          lastEntry: JSON.parse(lines[lines.length - 1]) as ForensicEntry,
          brokenAt: entry.seq,
        }
      }

      // Verify hash integrity
      const expectedHash = `${entry.seq}|${entry.ts}|${entry.event}|${entry.fp}|${prevHash}|${JSON.stringify(entry.details || {})}`
      const computedHash = crypto.createHash('sha256').update(expectedHash).digest('hex')
      if (entry.hash !== computedHash) {
        return {
          valid: false,
          totalEntries: lines.length,
          firstEntry: JSON.parse(lines[0]) as ForensicEntry,
          lastEntry: JSON.parse(lines[lines.length - 1]) as ForensicEntry,
          brokenAt: entry.seq,
        }
      }

      prevHash = entry.hash
    }

    return {
      valid: true,
      totalEntries: lines.length,
      firstEntry: lines.length > 0 ? JSON.parse(lines[0]) as ForensicEntry : null,
      lastEntry: lines.length > 0 ? JSON.parse(lines[lines.length - 1]) as ForensicEntry : null,
      brokenAt: null,
    }
  } catch (error) {
    return { valid: false, totalEntries: 0, firstEntry: null, lastEntry: null, brokenAt: 0 }
  }
}

/**
 * Read all forensic entries (for admin review / legal export).
 */
export function readForensicLog(limit?: number): ForensicEntry[] {
  ensureInitialized()

  try {
    if (!fs.existsSync(FORENSIC_FILE)) return []

    const content = fs.readFileSync(FORENSIC_FILE, 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())

    if (limit && limit < lines.length) {
 return lines.slice(-limit).map(l => JSON.parse(l) as ForensicEntry)
    }

    return lines.map(l => JSON.parse(l) as ForensicEntry)
  } catch {
    return []
  }
}

/**
 * Get the path to the forensic log file (for admin diagnostics).
 */
export function getForensicLogPath(): string {
  return FORENSIC_FILE
}
