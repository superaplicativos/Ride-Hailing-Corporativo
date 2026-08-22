/**
 * FleetControl — License Tracking Server
 * 
 * Deploy this server on YOUR infrastructure (VPS, Railway, Render, etc.)
 * Then set FLEET_LICENSE_SERVER env var on the FleetControl app to point here.
 * 
 * ENDPOINTS:
 *   POST /api/report     — Receives tracking events from FleetControl instances
 *   GET  /api/installations — List all known installations
 *   GET  /api/events?fp=  — Get events for a specific fingerprint
 *   GET  /api/events?limit=&offset= — Paginated event listing
 *   GET  /api/dashboard   — Summary stats for your dashboard
 *   DELETE /api/installations/:fp — Remove an installation
 * 
 * STORAGE: JSONL file (one event per line, append-only)
 * Each event contains full installation fingerprint, user data, and metadata.
 */

import express from 'express'
import cors from 'cors'
import * as fs from 'fs'
import * as path from 'path'

const app = express()
const PORT = process.env.PORT || 3100

// ─── Storage ─────────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, 'data')
const REPORTS_FILE = path.join(DATA_DIR, 'reports.jsonl')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

interface TrackingEvent {
  fp: string
  fp_short: string
  event: string
  ts: string
  domain: string
  ip: string
  user_id?: string
  user_role?: string
  details?: Record<string, unknown>
  signals?: Record<string, string>
  app: string
  version: string
}

// Append an event to the JSONL file
function appendEvent(event: TrackingEvent) {
  ensureDataDir()
  const line = JSON.stringify(event)
  fs.appendFileSync(REPORTS_FILE, line + '\n', 'utf-8')
}

// Read all events (with optional limit/offset)
function readEvents(limit?: number, offset?: number): TrackingEvent[] {
  ensureDataDir()
  if (!fs.existsSync(REPORTS_FILE)) return []

  const content = fs.readFileSync(REPORTS_FILE, 'utf-8')
  const lines = content.split('\n').filter(l => l.trim())
  const events = lines.map(l => JSON.parse(l) as TrackingEvent)

  // Sort by timestamp descending
  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

  const start = offset || 0
  if (limit) return events.slice(start, start + limit)
  return events.slice(start)
}

// ─── Middleware ───────────────────────────────────────────────────────────

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Simple API key protection (optional but recommended)
const API_KEY = process.env.TRACKER_API_KEY || ''
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!API_KEY) return next() // No key configured = open access
  const key = req.headers['x-api-key'] || req.query.api_key
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// ─── Routes ──────────────────────────────────────────────────────────────

/**
 * POST /api/report
 * Receives a tracking event from a FleetControl installation.
 * This is called automatically by the phone-home system.
 */
app.post('/api/report', (req, res) => {
  try {
    const event = req.body as TrackingEvent

    // Basic validation
    if (!event.fp || !event.event || !event.ts) {
      return res.status(400).json({ error: 'Missing required fields: fp, event, ts' })
    }

    // Store the event
    appendEvent(event)

    // Special handling for alert events (log to separate file for visibility)
    if (event.event === 'alert') {
      const alertFile = path.join(DATA_DIR, 'alerts.jsonl')
      fs.appendFileSync(alertFile, JSON.stringify(event) + '\n', 'utf-8')
      console.log(`\x1b[31m[ALERT] Unlicensed usage detected!\x1b[0m FP: ${event.fp_short} | IP: ${event.ip} | Domain: ${event.domain}`)
    }

    // Log install events
    if (event.event === 'install') {
      console.log(`\x1b[32m[NEW INSTALL]\x1b[0m FP: ${event.fp_short} | IP: ${event.ip} | Domain: ${event.domain}`)
    }

    // Log logins
    if (event.event === 'login' && event.details) {
      const d = event.details as Record<string, string>
      console.log(`[LOGIN] FP: ${event.fp_short} | User: ${d.email || event.user_id} | Role: ${event.user_role}`)
    }

    res.json({ received: true })
  } catch (error) {
    console.error('Error processing report:', error)
    res.status(500).json({ error: 'Internal error' })
  }
})

/**
 * GET /api/installations
 * List all unique installations (by fingerprint).
 */
app.get('/api/installations', requireAuth, (req, res) => {
  const events = readEvents()
  const fpMap = new Map<string, {
    fingerprint: string
    fp_short: string
    first_seen: string
    last_seen: string
    domain: string
    ip: string
    total_events: number
    logins: number
    dispatches: number
    alerts: number
    signals?: Record<string, string>
  }>()

  for (const evt of events) {
    const existing = fpMap.get(evt.fp)
    if (existing) {
      existing.last_seen = evt.ts
      existing.total_events++
      if (evt.event === 'login') existing.logins++
      if (evt.event === 'dispatch') existing.dispatches++
      if (evt.event === 'alert') existing.alerts++
      if (evt.signals) existing.signals = evt.signals
    } else {
      fpMap.set(evt.fp, {
        fingerprint: evt.fp,
        fp_short: evt.fp_short,
        first_seen: evt.ts,
        last_seen: evt.ts,
        domain: evt.domain,
        ip: evt.ip,
        total_events: 1,
        logins: evt.event === 'login' ? 1 : 0,
        dispatches: evt.event === 'dispatch' ? 1 : 0,
        alerts: evt.event === 'alert' ? 1 : 0,
        signals: evt.signals,
      })
    }
  }

  const installations = Array.from(fpMap.values())
    .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())

  res.json({ installations, total: installations.length })
})

/**
 * GET /api/events
 * Get tracking events with pagination and filtering.
 */
app.get('/api/events', requireAuth, (req, res) => {
  const { fp, event, limit, offset } = req.query
  let events = readEvents(
    limit ? parseInt(limit as string) : undefined,
    offset ? parseInt(offset as string) : undefined,
  )

  if (fp) events = events.filter(e => e.fp === fp)
  if (event) events = events.filter(e => e.event === event)

  res.json({ events, total: events.length })
})

/**
 * GET /api/dashboard
 * Summary statistics for the tracking dashboard.
 */
app.get('/api/dashboard', requireAuth, (_req, res) => {
  const events = readEvents()
  const fpSet = new Set(events.map(e => e.fp))
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const active1h = events.filter(e => new Date(e.ts) > oneHourAgo).map(e => e.fp)
  const active1d = events.filter(e => new Date(e.ts) > oneDayAgo).map(e => e.fp)
  const active7d = events.filter(e => new Date(e.ts) > sevenDaysAgo).map(e => e.fp)

  const alerts = events.filter(e => e.event === 'alert')
  const logins = events.filter(e => e.event === 'login')
  const dispatches = events.filter(e => e.event === 'dispatch')

  res.json({
    total_installations: fpSet.size,
    total_events: events.length,
    active_last_hour: new Set(active1h).size,
    active_last_day: new Set(active1d).size,
    active_last_7_days: new Set(active7d).size,
    total_logins: logins.length,
    total_dispatches: dispatches.length,
    total_alerts: alerts.length,
    unlicensed_installations: alerts.map(a => ({
      fp: a.fp,
      fp_short: a.fp_short,
      domain: a.domain,
      ip: a.ip,
      last_alert: a.ts,
      details: a.details,
    })),
  })
})

/**
 * DELETE /api/installations/:fp
 * Remove all events for a specific fingerprint (e.g., after licensing).
 */
app.delete('/api/installations/:fp', requireAuth, (req, res) => {
  const { fp } = req.params
  const events = readEvents().filter(e => e.fp !== fp)

  ensureDataDir()
  const content = events.map(e => JSON.stringify(e)).join('\n') + '\n'
  fs.writeFileSync(REPORTS_FILE, content, 'utf-8')

  res.json({ removed: true, fingerprint: fp })
})

// ─── Start ───────────────────────────────────────────────────────────────

ensureDataDir()
app.listen(PORT, () => {
  console.log(`\n\x1b[36m═══════════════════════════════════════════\x1b[0m`)
  console.log(`\x1b[36m  FleetControl License Tracker\x1b[0m`)
  console.log(`\x1b[36m  Running on port ${PORT}\x1b[0m`)
  console.log(`\x1b[36m  Data: ${REPORTS_FILE}\x1b[0m`)
  console.log(`\x1b[36m  API Key: ${API_KEY ? 'configured' : 'NOT SET (open access)'}\x1b[0m`)
  console.log(`\x1b[36m═══════════════════════════════════════════\x1b[0m\n`)
})
