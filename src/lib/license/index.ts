/**
 * FleetControl — License Enforcement System
 * 
 * This module provides installation tracking, license validation,
 * and forensic logging capabilities.
 * 
 * COMPONENTS:
 * - fingerprint.ts : Generates unique installation identifiers
 * - tracker.ts    : Phone-home telemetry to external server
 * - forensic-log.ts: Immutable, hash-chained local evidence log
 * - license-guard.ts: License validation with progressive degradation
 * 
 * INTEGRATION POINTS (already instrumented in codebase):
 * - Auth login    : trackLogin() on every successful login
 * - Ride dispatch : licenseGuard() + trackDispatch() on every dispatch
 * - User creation : trackUserCreate() on every new user
 * - All API calls : licenseGuard() logs every request to forensic trail
 * - App startup   : initTracker() on server boot
 */

export { generateFingerprint, getFingerprintDetails, getShortFingerprint } from './fingerprint'
export { initTracker, trackLogin, trackDispatch, trackConfigChange, trackUserCreate, trackAlert, getTrackerStatus, flushAllEvents } from './tracker'
export { writeForensicEntry, verifyForensicChain, readForensicLog, getForensicLogPath } from './forensic-log'
export { licenseGuard, applyDispatchDelay, isFeatureDisabled } from './license-guard'
export type { LicenseCheckResult } from './license-guard'
export type { ForensicEntry } from './forensic-log'