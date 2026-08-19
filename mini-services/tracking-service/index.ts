import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Active simulation intervals
const activeSimulations = new Map<string, ReturnType<typeof setInterval>>()

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  socket.on('join-dashboard', () => {
    socket.join('dashboard')
    console.log(`${socket.id} joined dashboard room`)
    socket.emit('joined-dashboard', { message: 'Subscribed to fleet-wide updates' })
  })

  socket.on('join-ride', (data: { rideId: string }) => {
    if (data && data.rideId) {
      socket.join(`ride-${data.rideId}`)
      console.log(`${socket.id} joined ride room: ride-${data.rideId}`)
      socket.emit('joined-ride', { rideId: data.rideId, message: `Subscribed to ride ${data.rideId}` })
    }
  })

  socket.on('leave-ride', (data: { rideId: string }) => {
    if (data && data.rideId) {
      socket.leave(`ride-${data.rideId}`)
      console.log(`${socket.id} left ride room: ride-${data.rideId}`)
    }
  })

  socket.on('leave-dashboard', () => {
    socket.leave('dashboard')
    console.log(`${socket.id} left dashboard room`)
  })

  socket.on('simulate-tracking', (data: { vehicleId: string; rideId?: string; intervalMs?: number }) => {
    if (!data || !data.vehicleId) {
      socket.emit('error', { message: 'vehicleId is required' })
      return
    }

    const { vehicleId, rideId, intervalMs = 2000 } = data
    const key = vehicleId

    // Stop existing simulation for this vehicle
    if (activeSimulations.has(key)) {
      clearInterval(activeSimulations.get(key)!)
      activeSimulations.delete(key)
    }

    // Start near São Paulo center
    let lat = -23.5505
    let lng = -46.6333
    let heading = Math.random() * 360

    const simulation = setInterval(() => {
      // Simulate small random movements
      const latDelta = (Math.random() - 0.5) * 0.002
      const lngDelta = (Math.random() - 0.5) * 0.002
      lat += latDelta
      lng += lngDelta
      heading += (Math.random() - 0.5) * 30
      if (heading < 0) heading += 360
      if (heading >= 360) heading -= 360

      const locationData = {
        vehicleId,
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
        heading: parseFloat(heading.toFixed(1)),
        timestamp: new Date().toISOString(),
        speed: parseFloat((20 + Math.random() * 40).toFixed(1)),
      }

      // Emit to dashboard room
      io.to('dashboard').emit('vehicle-location', locationData)

      // Emit to specific ride room if provided
      if (rideId) {
        io.to(`ride-${rideId}`).emit('vehicle-location', locationData)
      }
    }, intervalMs)

    activeSimulations.set(key, simulation)
    console.log(`Started tracking simulation for vehicle: ${vehicleId}`)
    socket.emit('simulation-started', { vehicleId, rideId, intervalMs })
  })

  socket.on('stop-tracking', (data: { vehicleId: string }) => {
    if (data && data.vehicleId && activeSimulations.has(data.vehicleId)) {
      clearInterval(activeSimulations.get(data.vehicleId)!)
      activeSimulations.delete(data.vehicleId)
      console.log(`Stopped tracking simulation for vehicle: ${data.vehicleId}`)
      socket.emit('simulation-stopped', { vehicleId: data.vehicleId })
    }
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`🚗 Tracking WebSocket service running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...')
  for (const interval of activeSimulations.values()) {
    clearInterval(interval)
  }
  activeSimulations.clear()
  httpServer.close(() => {
    console.log('Tracking service closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...')
  for (const interval of activeSimulations.values()) {
    clearInterval(interval)
  }
  activeSimulations.clear()
  httpServer.close(() => {
    console.log('Tracking service closed')
    process.exit(0)
  })
})
