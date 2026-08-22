/**
 * FleetControl — Phone-Home Telemetry Tracker
 * 
 * Periodically sends installation data to an external tracking server.
 * This is fire-and-forget: failures never block the application.
 * 
 * TRACKING EVENTS:
 * - install       : First boot / new fingerprint detected
 * - heartbeat     : Periodic ping (every 4h)
 * - login         : User logged in
 * - dispatch      : Ride dispatched (critical business operation)
 * - config_change : System configuration modified
 * - user_create   : New user created
 * - alert         : License violation detected
 * 
 * DATA SENT (per event):
 * - fp            : Installation fingerprint (SHA-256)
 * - fp_short      : Short fingerprint (12 chars)
 * - event         : Event type
 * - ts            : ISO 8601 timestamp
 * - domain        : Server domain/host
 * - ip            : Server public IP (fetched once at boot)
 * - user_id       : Related user (if applicable)
 * - user_role     : Related user role (if applicable)
 * - details       : Event-specific metadata (JSON)
 * - signals       : Machine fingerprint signals
 */

import { generateFingerprint, getFingerprintDetails, getShortFingerprint } from './fingerprint'

// ─── Configuration ────────────────────────────────────────────────────────

/** 
 * URL of your tracking server. 
 * CHANGE THIS to your own server before deploying.
 * You can use the included mini-services/license-tracker/ server.
 */
const TRACKER_URL = process.env.FLEET_LICENSE_SERVER || 'https://your-tracker.example.com/api/report'

/** Heartbeat interval in milliseconds (default: 4 hours) */
const HEARTBEAT_INTERVAL = 4 * 60 * 60 * 1000

/** Request timeout in ms — must not block the app */
const TRACKER_TIMEOUT = 5000

// ─── State ────────────────────────────────────────────────────────────────

let _publicIp: string | null = null
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null
let _initialized = false
let _eventQueue: TrackerEvent[] = []
let _flushTimer: ReturnType<typeof setTimeout> | null = null

interface TrackerEvent {
  event: string
  userId?: string
  userRole?: string
  details?: Record<string, unknown>
}

// ─── IP Discovery ─────────────────────────────────────────────────────────

async function discoverPublicIp(): Promise<string> {
  // Try multiple services for resilience
  const services = [
    'https://api.ipify.org?format=json',
    'https://ipinfo.io/json',
    'https://api.my-ip.io/v2/ip.json',
  ]

  for (const url of services) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      return data.ip || 'unknown'
    } catch {
      continue
    }
  }
  return 'unknown'
}

// ─── Core Send Function ───────────────────────────────────────────────────

function buildPayload(event: string, extra?: TrackerEvent): Record<string, unknown> {
  return {
    fp: generateFingerprint(),
    fp_short: getShortFingerprint(),
    event,
    ts: new Date().toISOString(),
    domain: typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'unknown'),
    ip: _publicIp || 'pending',
    user_id: extra?.userId || null,
    user_role: extra?.userRole || null,
    details: extra?.details || null,
    signals: getFingerprintDetails(),
    app: 'fleetcontrol',
    version: process.env.npm_package_version || '1.0.0',
  }
}

async function sendToTracker(payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(TRACKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TRACKER_TIMEOUT),
    })
  } catch {
    // Fire-and-forget: tracker failure MUST NOT affect the application
    // Errors are silently swallowed to avoid detection
  }
}

// ─── Event Queue (batched sending) ───────────────────────────────────────

function queueEvent(event: TrackerEvent): void {
  _eventQueue.push(event)
  // Flush after 30 seconds of inactivity, or when queue reaches 5
  if (_eventQueue.length >= 5) {
    flushQueue()
  } else if (!_flushTimer) {
    _flushTimer = setTimeout(() => {
      flushQueue()
      _flushTimer = null
    }, 30000)
  }
}

function flushQueue(): void {
  if (_eventQueue.length === 0) return
  if (_flushTimer) {
    clearTimeout(_flushTimer)
    _flushTimer = null
  }

  const eventsToSend = [..._eventQueue]
  _eventQueue = []

  for (const evt of eventsToSend) {
    const payload = buildPayload(evt.event, evt)
    sendToTracker(payload) // fire-and-forget
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Initialize the tracker. Call once at app startup.
 * Discovers public IP and starts heartbeat timer.
 */
export async function initTracker(): Promise<void> {
  if (_initialized) return
  _initialized = true

  // Discover IP asynchronously (non-blocking)
  discoverPublicIp().then(ip => { _publicIp = ip }).catch(() => { /* silent */ })

  // Send initial install event
  sendToTracker(buildPayload('install'))

  // Start periodic heartbeat
  _heartbeatTimer = setInterval(() => {
    sendToTracker(buildPayload('heartbeat'))
  }, HEARTBEAT_INTERVAL)

  // Ensure heartbeat doesn't prevent process exit
  if (_heartbeatTimer.unref) {
    _heartbeatTimer.unref()
  }
}

/**
 * Track a user login event.
 */
export function trackLogin(userId: string, userRole: string, details?: Record<string, unknown>): void {
  queueEvent({ event: 'login', userId, userRole, details })
}

/**
 * Track a ride dispatch event (critical operation).
 */
export function trackDispatch(rideId: string, driverId: string, userId: string, userRole: string): void {
  queueEvent({
    event: 'dispatch',
    userId,
    userRole,
    details: { rideId, driverId, timestamp: new Date().toISOString() },
  })
}

/**
 * Track a configuration change.
 */
export function trackConfigChange(userId: string, resource: string, action: string): void {
  queueEvent({
    event: 'config_change',
    userId,
    userRole: '',
    details: { resource, action, timestamp: new Date().toISOString() },
  })
}

/**
 * Track new user creation.
 */
export function trackUserCreate(createdBy: string, newUserId: string, newRole: string): void {
  queueEvent({
    event: 'user_create',
    userId: createdBy,
    userRole: '',
    details: { newUserId, newRole, timestamp: new Date().toISOString() },
  })
}

/**
 * Track a license alert (suspicious activity detected).
 */
export function trackAlert(alertType: string, details: Record<string, unknown>): void {
  queueEvent({ event: 'alert', details: { alertType, ...details } })
}

/**
 * Get current tracking status (for admin diagnostics).
 */
export function getTrackerStatus(): {
  initialized: boolean
  publicIp: string | null
  fingerprint: string
  queuedEvents: number
  trackerUrl: string
} {
  return {
    initialized: _initialized,
    publicIp: _publicIp,
    fingerprint: generateFingerprint(),
    queuedEvents: _eventQueue.length,
    trackerUrl: TRACKER_URL,
  }
}

/**
 * Immediately flush all queued events (useful before shutdown).
 */
export async function flushAllEvents(): Promise<void> {
  flushQueue()
  // Give a small window for in-flight requests
  await new Promise(resolve => setTimeout(resolve, 2000))
}