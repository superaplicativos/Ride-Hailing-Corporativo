/**
 * Haversine formula to calculate the distance between two points on Earth.
 */
export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusKm: number
): boolean {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  return distance <= radiusKm
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Check if current time is within allowed time window.
 * Times are in HH:mm format.
 */
export function isWithinAllowedTime(startTime: string, endTime: string): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  }
  // Handle overnight (e.g., 22:00 - 06:00)
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes
}

/**
 * Check if today is in the allowed days list.
 * Days: 0=Sun, 1=Mon, ..., 6=Sat
 */
export function isAllowedDay(allowedDays: string): boolean {
  const today = new Date().getDay().toString()
  const days = allowedDays.split(',').map(d => d.trim())
  return days.includes(today)
}

/**
 * Validate a ride request against all availability rules.
 * Returns { valid: true } if all rules pass, or { valid: false, reason: string } if any fails.
 */
export function validateRideRequest(
  pickupLat: number,
  pickupLng: number,
  rules: { centerLat: number | null; centerLng: number | null; radiusKm: number | null; allowedDays: string; startTime: string | null; endTime: string | null; name: string }[]
): { valid: boolean; reason?: string } {
  if (rules.length === 0) {
    return { valid: true }
  }

  for (const rule of rules) {
    if (!isAllowedDay(rule.allowedDays)) {
      return { valid: false, reason: `Rides are not available today per rule: ${rule.name}` }
    }

    if (rule.startTime && rule.endTime && !isWithinAllowedTime(rule.startTime, rule.endTime)) {
      return { valid: false, reason: `Current time is outside allowed hours per rule: ${rule.name} (${rule.startTime} - ${rule.endTime})` }
    }

    if (rule.centerLat != null && rule.centerLng != null && rule.radiusKm != null) {
      if (!isWithinRadius(pickupLat, pickupLng, rule.centerLat, rule.centerLng, rule.radiusKm)) {
        return { valid: false, reason: `Pickup location is outside the allowed area per rule: ${rule.name} (${rule.radiusKm}km radius)` }
      }
    }
  }

  return { valid: true }
}
