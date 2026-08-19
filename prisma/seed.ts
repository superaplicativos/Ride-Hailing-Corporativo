import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SALT_ROUNDS = 10

async function main() {
  console.log('Seeding database...')

  // Clean existing data (in order of dependencies)
  await prisma.auditLog.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.ride.deleteMany()
  await prisma.vehicleCheckout.deleteMany()
  await prisma.vehicleMetadata.deleteMany()
  await prisma.costCenterMetadata.deleteMany()
  await prisma.passenger.deleteMany()
  await prisma.driver.deleteMany()
  await prisma.costCenter.deleteMany()
  await prisma.availabilityRule.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.user.deleteMany()

  // ============ Users ============
  const adminPasswordHash = await bcrypt.hash('Admin@123', SALT_ROUNDS)
  const managerPasswordHash = await bcrypt.hash('Manager@123', SALT_ROUNDS)
  const driverPasswordHash = await bcrypt.hash('Driver@123', SALT_ROUNDS)
  const passengerPasswordHash = await bcrypt.hash('Passenger@123', SALT_ROUNDS)

  const admin = await prisma.user.create({
    data: {
      email: 'admin@corporate.com',
      name: 'Administrador Global',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
    },
  })
  console.log('Created SUPER_ADMIN:', admin.email)

  const manager = await prisma.user.create({
    data: {
      email: 'manager@corporate.com',
      name: 'Gerente Filial SP',
      passwordHash: managerPasswordHash,
      role: 'MANAGER',
      branchId: 'branch-1',
      branchName: 'São Paulo',
    },
  })
  console.log('Created MANAGER:', manager.email)

  const driver1User = await prisma.user.create({
    data: {
      email: 'driver1@corporate.com',
      name: 'Carlos Motorista',
      passwordHash: driverPasswordHash,
      role: 'DRIVER',
      branchId: 'branch-1',
      branchName: 'São Paulo',
    },
  })

  const driver2User = await prisma.user.create({
    data: {
      email: 'driver2@corporate.com',
      name: 'João Motorista',
      passwordHash: driverPasswordHash,
      role: 'DRIVER',
      branchId: 'branch-1',
      branchName: 'São Paulo',
    },
  })

  const passenger1User = await prisma.user.create({
    data: {
      email: 'passenger1@corporate.com',
      name: 'Maria Passageira',
      passwordHash: passengerPasswordHash,
      role: 'PASSENGER',
      branchId: 'branch-1',
      branchName: 'São Paulo',
    },
  })

  const passenger2User = await prisma.user.create({
    data: {
      email: 'passenger2@corporate.com',
      name: 'Pedro Passageiro',
      passwordHash: passengerPasswordHash,
      role: 'PASSENGER',
      branchId: 'branch-1',
      branchName: 'São Paulo',
    },
  })
  console.log('Created driver and passenger users')

  // ============ Vehicles ============
  const vehicle1 = await prisma.vehicle.create({
    data: { plate: 'ABC-1234', model: 'Toyota Corolla 2023', capacity: 4, color: 'Prata', year: 2023 },
  })
  const vehicle2 = await prisma.vehicle.create({
    data: { plate: 'DEF-5678', model: 'Honda Civic 2022', capacity: 4, color: 'Preto', year: 2022 },
  })
  const vehicle3 = await prisma.vehicle.create({
    data: { plate: 'GHI-9012', model: 'Hyundai HB20 2024', capacity: 4, color: 'Branco', year: 2024 },
  })
  console.log('Created 3 vehicles:', vehicle1.plate, vehicle2.plate, vehicle3.plate)

  // ============ Drivers ============
  const driver1 = await prisma.driver.create({
    data: {
      userId: driver1User.id,
      licenseNumber: '12345678901',
      licenseExpiry: new Date('2026-12-31'),
      phone: '(11) 99999-1111',
      currentVehicleId: vehicle1.id,
    },
  })
  const driver2 = await prisma.driver.create({
    data: {
      userId: driver2User.id,
      licenseNumber: '98765432100',
      licenseExpiry: new Date('2025-06-30'),
      phone: '(11) 99999-2222',
      currentVehicleId: vehicle2.id,
    },
  })
  console.log('Created 2 drivers')

  // ============ Cost Centers ============
  const cc1 = await prisma.costCenter.create({
    data: { name: 'Marketing', code: 'CC-001', description: 'Centro de custo do departamento de Marketing' },
  })
  const cc2 = await prisma.costCenter.create({
    data: { name: 'Financeiro', code: 'CC-002', description: 'Centro de custo do departamento Financeiro' },
  })
  console.log('Created 2 cost centers:', cc1.code, cc2.code)

  // ============ Passengers ============
  const passenger1 = await prisma.passenger.create({
    data: {
      userId: passenger1User.id,
      phone: '(11) 98888-1111',
      costCenterId: cc1.id,
    },
  })
  const passenger2 = await prisma.passenger.create({
    data: {
      userId: passenger2User.id,
      phone: '(11) 98888-2222',
      costCenterId: cc2.id,
    },
  })
  console.log('Created 2 passengers')

  // ============ Availability Rule ============
  const rule = await prisma.availabilityRule.create({
    data: {
      name: 'Horário Comercial SP',
      description: 'Regras para horário comercial na região de São Paulo',
      centerLat: -23.5505,
      centerLng: -46.6333,
      radiusKm: 50,
      allowedDays: '1,2,3,4,5',
      startTime: '08:00',
      endTime: '18:00',
    },
  })
  console.log('Created availability rule:', rule.name)

  // ============ Sample Completed Ride ============
  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 2)

  const sampleRide = await prisma.ride.create({
    data: {
      passengerId: passenger1.id,
      driverId: driver1.id,
      vehicleId: vehicle1.id,
      costCenterId: cc1.id,
      status: 'COMPLETED',
      pickupAddress: 'Av. Paulista, 1000 - Bela Vista, São Paulo',
      pickupLat: -23.5631,
      pickupLng: -46.6544,
      dropoffAddress: 'Rua Faria Lima, 3477 - Itaim Bibi, São Paulo',
      dropoffLat: -23.5742,
      dropoffLng: -46.6896,
      requestedAt: pastDate,
      dispatchedAt: pastDate,
      arrivedAt: pastDate,
      startedAt: pastDate,
      completedAt: pastDate,
      notes: 'Viagem corporativa rotineira',
    },
  })
  console.log('Created sample completed ride')

  console.log('\n✅ Seed completed successfully!')
  console.log('\nTest accounts:')
  console.log('  SUPER_ADMIN: admin@corporate.com / Admin@123')
  console.log('  MANAGER:     manager@corporate.com / Manager@123')
  console.log('  DRIVER:      driver1@corporate.com / Driver@123')
  console.log('  PASSENGER:   passenger1@corporate.com / Passenger@123')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
