import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const BASE_PRODUCTS = [
  // Beer
  { name: 'Castle Lager', unit: 'bottle', category: 'beer' },
  { name: 'Castle Lite', unit: 'bottle', category: 'beer' },
  { name: 'Heineken', unit: 'bottle', category: 'beer' },
  { name: 'Amstel', unit: 'bottle', category: 'beer' },
  { name: 'Black Label', unit: 'can', category: 'beer' },
  { name: 'Windhoek Draught', unit: 'bottle', category: 'beer' },
  { name: 'Corona', unit: 'bottle', category: 'beer' },
  { name: 'Savanna Dry', unit: 'bottle', category: 'cider' },
  { name: 'Hunters Gold', unit: 'can', category: 'cider' },
  { name: 'Flying Fish', unit: 'bottle', category: 'cider' },
  // Wine
  { name: 'House Red Wine', unit: 'bottle', category: 'wine' },
  { name: 'House White Wine', unit: 'bottle', category: 'wine' },
  { name: 'House Rosé', unit: 'bottle', category: 'wine' },
  // Spirits
  { name: 'Klipdrift Brandy', unit: 'bottle', category: 'spirit' },
  { name: 'Jameson Whiskey', unit: 'bottle', category: 'spirit' },
  { name: 'Absolut Vodka', unit: 'bottle', category: 'spirit' },
  { name: 'Bacardi Rum', unit: 'bottle', category: 'spirit' },
  { name: 'Tanqueray Gin', unit: 'bottle', category: 'spirit' },
  // Soft drinks / mixers
  { name: 'Coca-Cola', unit: 'can', category: 'soft drink' },
  { name: 'Sprite', unit: 'can', category: 'soft drink' },
  { name: 'Fanta Orange', unit: 'can', category: 'soft drink' },
  { name: 'Still Water', unit: 'bottle', category: 'soft drink' },
  { name: 'Sparkling Water', unit: 'bottle', category: 'soft drink' },
  { name: 'Tonic Water', unit: 'can', category: 'soft drink' },
  { name: 'Red Bull', unit: 'can', category: 'soft drink' },
]

async function main() {
  console.log('Seeding database...')

  // Admin user
  const passwordHash = await bcrypt.hash('changeme123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@barstock.local' },
    update: {},
    create: {
      email: 'admin@barstock.local',
      passwordHash,
      name: 'Admin',
      role: 'ADMIN',
    },
  })
  console.log(`✓ Admin user: ${admin.email} / changeme123`)

  // Demo runner
  const runner = await prisma.user.upsert({
    where: { email: 'runner@barstock.local' },
    update: {},
    create: {
      email: 'runner@barstock.local',
      passwordHash: await bcrypt.hash('changeme123', 10),
      name: 'Stock Runner',
      role: 'RUNNER',
    },
  })
  console.log(`✓ Runner user: ${runner.email} / changeme123`)

  // Base products
  for (const p of BASE_PRODUCTS) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    })
  }
  console.log(`✓ ${BASE_PRODUCTS.length} products seeded`)

  console.log('Done!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
