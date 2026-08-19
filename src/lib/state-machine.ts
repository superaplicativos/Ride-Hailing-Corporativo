const VEHICLE_TRANSITIONS = new Map<string, string[]>([  ['AVAILABLE', ['EN_ROUTE', 'OFFLINE', 'MAINTENANCE']],
  ['EN_ROUTE', ['IN_RIDE', 'AVAILABLE']],
  ['IN_RIDE', ['AVAILABLE']],
  ['OFFLINE', ['AVAILABLE']],
  ['MAINTENANCE', ['AVAILABLE']],
])

const RIDE_TRANSITIONS = new Map<string, string[]>([  ['REQUESTED', ['DISPATCHED', 'CANCELED']],
  ['DISPATCHED', ['ARRIVED_AT_PICKUP', 'CANCELED']],
  ['ARRIVED_AT_PICKUP', ['IN_PROGRESS', 'CANCELED']],
  ['IN_PROGRESS', ['COMPLETED', 'CANCELED']],
])

export { VEHICLE_TRANSITIONS, RIDE_TRANSITIONS }

export function canTransition(
  current: string,
  target: string,
  transitions: Map<string, string[]>
): boolean {
  const allowed = transitions.get(current)
  if (!allowed) return false
  return allowed.includes(target)
}
