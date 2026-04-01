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
  { name: 'Klipdrift Brandy', unit: 'bottle', category: 'spirit', totsPerBottle: 30 },
  { name: 'Jameson Whiskey', unit: 'bottle', category: 'spirit', totsPerBottle: 30 },
  { name: 'Absolut Vodka', unit: 'bottle', category: 'spirit', totsPerBottle: 30 },
  { name: 'Bacardi Rum', unit: 'bottle', category: 'spirit', totsPerBottle: 30 },
  { name: 'Tanqueray Gin', unit: 'bottle', category: 'spirit', totsPerBottle: 30 },
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
  console.log('🍺 Seeding BarStock demo data...\n')

  const passwordHash = await bcrypt.hash('changeme123', 10)

  // ─── USERS ───────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@barstock.local' },
    update: {},
    create: { email: 'admin@barstock.local', passwordHash, name: 'Admin', role: 'ADMIN' },
  })

  const sectionMgr = await prisma.user.upsert({
    where: { email: 'manager@barstock.local' },
    update: {},
    create: { email: 'manager@barstock.local', passwordHash, name: 'Sipho Ndlovu', role: 'SECTION_MANAGER' },
  })

  const runner = await prisma.user.upsert({
    where: { email: 'runner@barstock.local' },
    update: {},
    create: { email: 'runner@barstock.local', passwordHash, name: 'Thabo Molefe', role: 'RUNNER' },
  })

  const stockRoom = await prisma.user.upsert({
    where: { email: 'stockroom@barstock.local' },
    update: {},
    create: { email: 'stockroom@barstock.local', passwordHash, name: 'Linda Govender', role: 'STOCK_ROOM_STAFF' },
  })

  const barStaff = await prisma.user.upsert({
    where: { email: 'barstaff@barstock.local' },
    update: {},
    create: { email: 'barstaff@barstock.local', passwordHash, name: 'Naledi Khumalo', role: 'BAR_STAFF' },
  })

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@barstock.local' },
    update: {},
    create: { email: 'viewer@barstock.local', passwordHash, name: 'Read-Only User', role: 'VIEWER' },
  })

  console.log('✓ Users:')
  console.log('  admin@barstock.local      / changeme123  → ADMIN')
  console.log('  manager@barstock.local    / changeme123  → SECTION_MANAGER')
  console.log('  runner@barstock.local     / changeme123  → RUNNER')
  console.log('  stockroom@barstock.local  / changeme123  → STOCK_ROOM_STAFF')
  console.log('  barstaff@barstock.local   / changeme123  → BAR_STAFF')
  console.log('  viewer@barstock.local     / changeme123  → VIEWER\n')

  // ─── PRODUCTS ────────────────────────────────────────
  const products: Record<string, any> = {}
  for (const p of BASE_PRODUCTS) {
    const created = await prisma.product.upsert({
      where: { name: p.name },
      update: { totsPerBottle: (p as any).totsPerBottle ?? null },
      create: p,
    })
    products[p.name] = created
  }
  console.log(`✓ ${BASE_PRODUCTS.length} products seeded\n`)

  // ─── EVENT ───────────────────────────────────────────
  // Delete existing demo event if re-seeding
  const existingEvent = await prisma.event.findFirst({ where: { name: 'DHL Stormers vs Bulls — HSBC SVNS 2026' } })
  if (existingEvent) {
    await prisma.event.delete({ where: { id: existingEvent.id } })
  }

  const event = await prisma.event.create({
    data: {
      name: 'DHL Stormers vs Bulls — HSBC SVNS 2026',
      date: new Date('2026-04-18T17:00:00Z'),
      venue: 'DHL Stadium, Cape Town',
      status: 'ACTIVE',
      notes: 'World Rugby HSBC SVNS — 65 suites across Levels 5-8. Comp + paid bars.',
    },
  })
  console.log(`✓ Event: ${event.name} (status: ACTIVE)`)

  // Enable all products for this event
  for (const p of Object.values(products)) {
    await prisma.eventProduct.create({
      data: { eventId: event.id, productId: p.id },
    })
  }

  // ─── CENTRAL STOCK (main store for the event) ───────
  const centralStockData: { name: string; qty: number }[] = [
    { name: 'Castle Lager', qty: 600 },
    { name: 'Castle Lite', qty: 400 },
    { name: 'Heineken', qty: 300 },
    { name: 'Amstel', qty: 200 },
    { name: 'Black Label', qty: 150 },
    { name: 'Windhoek Draught', qty: 200 },
    { name: 'Corona', qty: 100 },
    { name: 'Savanna Dry', qty: 300 },
    { name: 'Hunters Gold', qty: 150 },
    { name: 'Flying Fish', qty: 100 },
    { name: 'House Red Wine', qty: 80 },
    { name: 'House White Wine', qty: 80 },
    { name: 'House Rosé', qty: 60 },
    { name: 'Klipdrift Brandy', qty: 30 },
    { name: 'Jameson Whiskey', qty: 40 },
    { name: 'Absolut Vodka', qty: 30 },
    { name: 'Bacardi Rum', qty: 20 },
    { name: 'Tanqueray Gin', qty: 30 },
    { name: 'Coca-Cola', qty: 500 },
    { name: 'Sprite', qty: 200 },
    { name: 'Fanta Orange', qty: 150 },
    { name: 'Still Water', qty: 400 },
    { name: 'Sparkling Water', qty: 200 },
    { name: 'Tonic Water', qty: 150 },
    { name: 'Red Bull', qty: 200 },
  ]
  for (const s of centralStockData) {
    await prisma.eventCentralStock.create({
      data: { eventId: event.id, productId: products[s.name].id, quantity: s.qty },
    })
  }
  console.log(`✓ Central stock loaded: ${centralStockData.reduce((a, b) => a + b.qty, 0)} total units\n`)

  // ─── BARS / SUITES ──────────────────────────────────
  // Stock rooms first
  const stockRoomWest = await prisma.bar.create({
    data: {
      eventId: event.id, name: 'Stock Room — Level 5 West', location: 'Level 5 West', barType: 'STOCK_ROOM',
      stockType: 'MIXED', responsibleCompany: 'BarStock Ops', managerId: stockRoom.id,
    },
  })

  const stockRoomEast = await prisma.bar.create({
    data: {
      eventId: event.id, name: 'Stock Room — Level 5 East', location: 'Level 5 East', barType: 'STOCK_ROOM',
      stockType: 'MIXED', responsibleCompany: 'BarStock Ops', managerId: stockRoom.id,
    },
  })
  console.log('✓ Stock rooms: Level 5 West, Level 5 East')

  // ─── STOCK ROOM INVENTORY ────────────────────────────
  // West serves suites 5100W–5105W (6 suites) + North suites
  // East serves East + South suites
  // Quantities reflect what was loaded at start of event minus what's been dispatched

  const stockRoomWestStock: { name: string; opening: number; current: number }[] = [
    { name: 'Castle Lager',      opening: 240, current: 168 }, // 6 x 12 opening + buffer, some dispatched
    { name: 'Castle Lite',       opening: 240, current: 192 },
    { name: 'Heineken',          opening: 120, current: 96  },
    { name: 'Amstel',            opening: 72,  current: 60  },
    { name: 'Black Label',       opening: 60,  current: 48  },
    { name: 'Windhoek Draught',  opening: 60,  current: 48  },
    { name: 'Corona',            opening: 48,  current: 36  },
    { name: 'Savanna Dry',       opening: 120, current: 84  },
    { name: 'Hunters Gold',      opening: 72,  current: 60  },
    { name: 'Flying Fish',       opening: 48,  current: 36  },
    { name: 'House Red Wine',    opening: 36,  current: 24  },
    { name: 'House White Wine',  opening: 36,  current: 24  },
    { name: 'House Rosé',        opening: 24,  current: 18  },
    { name: 'Klipdrift Brandy',  opening: 12,  current: 9   },
    { name: 'Jameson Whiskey',   opening: 18,  current: 12  },
    { name: 'Absolut Vodka',     opening: 12,  current: 8   },
    { name: 'Bacardi Rum',       opening: 8,   current: 6   },
    { name: 'Tanqueray Gin',     opening: 12,  current: 7   },
    { name: 'Coca-Cola',         opening: 240, current: 192 },
    { name: 'Sprite',            opening: 120, current: 96  },
    { name: 'Fanta Orange',      opening: 72,  current: 60  },
    { name: 'Still Water',       opening: 240, current: 204 },
    { name: 'Sparkling Water',   opening: 96,  current: 84  },
    { name: 'Tonic Water',       opening: 120, current: 84  },
    { name: 'Red Bull',          opening: 96,  current: 60  },
  ]

  const stockRoomEastStock: { name: string; opening: number; current: number }[] = [
    { name: 'Castle Lager',      opening: 180, current: 156 },
    { name: 'Castle Lite',       opening: 180, current: 168 },
    { name: 'Heineken',          opening: 96,  current: 84  },
    { name: 'Amstel',            opening: 48,  current: 42  },
    { name: 'Black Label',       opening: 48,  current: 42  },
    { name: 'Windhoek Draught',  opening: 48,  current: 36  },
    { name: 'Corona',            opening: 36,  current: 30  },
    { name: 'Savanna Dry',       opening: 96,  current: 84  },
    { name: 'Hunters Gold',      opening: 48,  current: 42  },
    { name: 'Flying Fish',       opening: 36,  current: 30  },
    { name: 'House Red Wine',    opening: 24,  current: 18  },
    { name: 'House White Wine',  opening: 24,  current: 18  },
    { name: 'House Rosé',        opening: 18,  current: 12  },
    { name: 'Klipdrift Brandy',  opening: 8,   current: 6   },
    { name: 'Jameson Whiskey',   opening: 12,  current: 9   },
    { name: 'Absolut Vodka',     opening: 8,   current: 6   },
    { name: 'Bacardi Rum',       opening: 6,   current: 4   },
    { name: 'Tanqueray Gin',     opening: 8,   current: 5   },
    { name: 'Coca-Cola',         opening: 180, current: 156 },
    { name: 'Sprite',            opening: 96,  current: 84  },
    { name: 'Fanta Orange',      opening: 60,  current: 54  },
    { name: 'Still Water',       opening: 180, current: 168 },
    { name: 'Sparkling Water',   opening: 72,  current: 66  },
    { name: 'Tonic Water',       opening: 96,  current: 72  },
    { name: 'Red Bull',          opening: 72,  current: 48  },
  ]

  for (const item of stockRoomWestStock) {
    await prisma.barInventory.create({
      data: {
        barId: stockRoomWest.id, productId: products[item.name].id,
        openingQuantity: item.opening, currentQuantity: item.current,
      },
    })
  }
  for (const item of stockRoomEastStock) {
    await prisma.barInventory.create({
      data: {
        barId: stockRoomEast.id, productId: products[item.name].id,
        openingQuantity: item.opening, currentQuantity: item.current,
      },
    })
  }

  const westTotal = stockRoomWestStock.reduce((a, b) => a + b.current, 0)
  const eastTotal = stockRoomEastStock.reduce((a, b) => a + b.current, 0)
  console.log(`✓ Stock Room West inventory: ${westTotal} units on hand (${stockRoomWestStock.length} SKUs)`)
  console.log(`✓ Stock Room East inventory: ${eastTotal} units on hand (${stockRoomEastStock.length} SKUs)\n`)

  // Sample suites — mix of comp and paid, different companies
  const suites = [
    { name: 'Suite 5100W', location: 'Level 5 – West', company: 'DHL CTS', stockType: 'COMP' },
    { name: 'Suite 5101W', location: 'Level 5 – West', company: 'DHL CTS', stockType: 'COMP' },
    { name: 'Suite 5102W', location: 'Level 5 – West', company: 'Investec', stockType: 'PAID' },
    { name: 'Suite 5103W', location: 'Level 5 – West', company: 'Old Mutual', stockType: 'PAID' },
    { name: 'Suite 5104W', location: 'Level 5 – West', company: 'Discovery', stockType: 'COMP' },
    { name: 'Suite 5105W (DHL CTS)', location: 'Level 5 – West', company: 'DHL CTS', stockType: 'COMP' },
    { name: 'Suite 510N', location: 'Level 5 – North', company: 'Standard Bank', stockType: 'PAID' },
    { name: 'Suite 511N', location: 'Level 5 – North', company: 'Nedbank', stockType: 'PAID' },
    { name: 'Suite 512N', location: 'Level 5 – North', company: 'FNB', stockType: 'PAID' },
    { name: 'Suite 513N', location: 'Level 5 – North', company: 'Capitec', stockType: 'PAID' },
    { name: 'Suite 541E', location: 'Level 5 – East', company: 'PwC', stockType: 'COMP' },
    { name: 'Suite 542E', location: 'Level 5 – East', company: 'Deloitte', stockType: 'PAID' },
    { name: 'Suite 543E', location: 'Level 5 – East', company: 'KPMG', stockType: 'PAID' },
    { name: 'Suite 563S', location: 'Level 5 – South', company: 'Coca-Cola SA', stockType: 'COMP' },
    { name: 'Suite 564S', location: 'Level 5 – South', company: 'SA Breweries', stockType: 'COMP' },
  ]

  const barMap: Record<string, any> = {}
  for (const s of suites) {
    const bar = await prisma.bar.create({
      data: {
        eventId: event.id, name: s.name, location: s.location,
        responsibleCompany: s.company, stockType: s.stockType, barType: 'BAR',
        managerId: sectionMgr.id,
      },
    })
    barMap[s.name] = bar
  }
  console.log(`✓ ${suites.length} suites created\n`)

  // ─── OPENING STOCK ALLOCATIONS ──────────────────────
  // Give each suite a standard opening stock
  const standardOpening: { name: string; qty: number }[] = [
    { name: 'Castle Lager', qty: 12 },
    { name: 'Castle Lite', qty: 12 },
    { name: 'Heineken', qty: 6 },
    { name: 'Savanna Dry', qty: 6 },
    { name: 'House Red Wine', qty: 2 },
    { name: 'House White Wine', qty: 2 },
    { name: 'Jameson Whiskey', qty: 1 },
    { name: 'Absolut Vodka', qty: 1 },
    { name: 'Coca-Cola', qty: 12 },
    { name: 'Still Water', qty: 12 },
    { name: 'Tonic Water', qty: 6 },
    { name: 'Red Bull', qty: 4 },
  ]

  for (const bar of Object.values(barMap)) {
    for (const item of standardOpening) {
      await prisma.barInventory.create({
        data: {
          barId: bar.id, productId: products[item.name].id,
          openingQuantity: item.qty, currentQuantity: item.qty,
        },
      })
    }
  }
  console.log(`✓ Opening stock allocated: ${standardOpening.length} products × ${suites.length} suites`)

  // ─── OPENING CONFIRMATIONS (some done, some pending) ──
  // Suites 5100W–5102W confirmed perfectly
  for (const suiteName of ['Suite 5100W', 'Suite 5101W', 'Suite 5102W']) {
    const bar = barMap[suiteName]
    for (const item of standardOpening) {
      await prisma.barStockConfirmation.create({
        data: {
          barId: bar.id, productId: products[item.name].id,
          confirmedQuantity: item.qty, confirmedBy: 'Naledi K.', confirmedAt: new Date(),
        },
      })
    }
  }
  console.log('  ✓ 5100W, 5101W, 5102W — confirmed ✓ (all match)')

  // Suite 5103W confirmed but SHORT on Castle Lager (got 10 instead of 12)
  const bar5103 = barMap['Suite 5103W']
  for (const item of standardOpening) {
    const qty = item.name === 'Castle Lager' ? 10 : item.qty  // 2 short!
    await prisma.barStockConfirmation.create({
      data: {
        barId: bar5103.id, productId: products[item.name].id,
        confirmedQuantity: qty, confirmedBy: 'John M.',
        notes: item.name === 'Castle Lager' ? 'Only received 10, not 12' : null,
      },
    })
  }
  console.log('  ✓ 5103W — confirmed with VARIANCE (Castle Lager: 10 vs 12 allocated)')

  // 5104W–5105W not yet confirmed (pending)
  console.log('  ⏳ 5104W, 5105W — not yet confirmed')
  console.log(`  ⏳ North/East/South suites — not yet confirmed\n`)

  // ─── DEMO MOVEMENTS ─────────────────────────────────

  // 1) A delivered restock request (full lifecycle complete)
  const movement1 = await prisma.stockMovement.create({
    data: {
      eventId: event.id, type: 'RESTOCK', status: 'DELIVERED',
      toBarId: barMap['Suite 5100W'].id, createdById: barStaff.id,
      approvedById: sectionMgr.id, notes: 'Running low on beer — halftime rush',
      approvedAt: new Date(Date.now() - 45 * 60000),
      dispatchedAt: new Date(Date.now() - 30 * 60000),
      deliveredAt: new Date(Date.now() - 15 * 60000),
      lines: {
        create: [
          { productId: products['Castle Lager'].id, quantityRequested: 12, quantityActual: 12 },
          { productId: products['Castle Lite'].id, quantityRequested: 6, quantityActual: 6 },
          { productId: products['Coca-Cola'].id, quantityRequested: 12, quantityActual: 12 },
        ],
      },
    },
  })
  console.log(`✓ Movement #${movement1.id}: DELIVERED restock to 5100W (beer + coke)`)

  // 2) An approved request — stock room is prepping
  const movement2 = await prisma.stockMovement.create({
    data: {
      eventId: event.id, type: 'RESTOCK', status: 'APPROVED',
      toBarId: barMap['Suite 510N'].id, createdById: barStaff.id,
      approvedById: sectionMgr.id, notes: 'Spirits running out, busy corporate suite',
      approvedAt: new Date(Date.now() - 10 * 60000),
      lines: {
        create: [
          { productId: products['Jameson Whiskey'].id, quantityRequested: 2 },
          { productId: products['Absolut Vodka'].id, quantityRequested: 2 },
          { productId: products['Tanqueray Gin'].id, quantityRequested: 1 },
          { productId: products['Tonic Water'].id, quantityRequested: 12 },
          { productId: products['Red Bull'].id, quantityRequested: 6 },
        ],
      },
    },
  })
  console.log(`✓ Movement #${movement2.id}: APPROVED restock to 510N (spirits) — waiting for stock room`)

  // 3) A READY request — stock room prepped, waiting for runner
  const movement3 = await prisma.stockMovement.create({
    data: {
      eventId: event.id, type: 'RESTOCK', status: 'READY',
      toBarId: barMap['Suite 541E'].id, createdById: barStaff.id,
      approvedById: admin.id, notes: 'VIP suite — urgent please',
      approvedAt: new Date(Date.now() - 20 * 60000),
      lines: {
        create: [
          { productId: products['Heineken'].id, quantityRequested: 12 },
          { productId: products['House Red Wine'].id, quantityRequested: 3 },
          { productId: products['House White Wine'].id, quantityRequested: 3 },
          { productId: products['Still Water'].id, quantityRequested: 12 },
        ],
      },
    },
  })
  console.log(`✓ Movement #${movement3.id}: READY restock to 541E (VIP) — waiting for runner`)

  // 4) An IN_TRANSIT request — runner is on the way
  const movement4 = await prisma.stockMovement.create({
    data: {
      eventId: event.id, type: 'RESTOCK', status: 'IN_TRANSIT',
      toBarId: barMap['Suite 563S'].id, createdById: barStaff.id,
      approvedById: sectionMgr.id, notes: 'Coca-Cola comp suite needs full restock',
      approvedAt: new Date(Date.now() - 25 * 60000),
      dispatchedAt: new Date(Date.now() - 5 * 60000),
      lines: {
        create: [
          { productId: products['Coca-Cola'].id, quantityRequested: 24 },
          { productId: products['Sprite'].id, quantityRequested: 12 },
          { productId: products['Still Water'].id, quantityRequested: 24 },
          { productId: products['Red Bull'].id, quantityRequested: 12 },
        ],
      },
    },
  })
  console.log(`✓ Movement #${movement4.id}: IN_TRANSIT restock to 563S — runner delivering now`)

  // 5) Two PENDING requests — awaiting section manager approval
  const movement5 = await prisma.stockMovement.create({
    data: {
      eventId: event.id, type: 'RESTOCK', status: 'PENDING',
      toBarId: barMap['Suite 5104W'].id, createdById: barStaff.id,
      notes: 'Need more beer for second half',
      lines: {
        create: [
          { productId: products['Castle Lager'].id, quantityRequested: 12 },
          { productId: products['Castle Lite'].id, quantityRequested: 12 },
          { productId: products['Savanna Dry'].id, quantityRequested: 6 },
        ],
      },
    },
  })

  const movement6 = await prisma.stockMovement.create({
    data: {
      eventId: event.id, type: 'RESTOCK', status: 'PENDING',
      toBarId: barMap['Suite 542E'].id, createdById: barStaff.id,
      notes: 'Wine and spirits top-up for Deloitte',
      lines: {
        create: [
          { productId: products['House Red Wine'].id, quantityRequested: 2 },
          { productId: products['House White Wine'].id, quantityRequested: 2 },
          { productId: products['Jameson Whiskey'].id, quantityRequested: 1 },
          { productId: products['Klipdrift Brandy'].id, quantityRequested: 1 },
        ],
      },
    },
  })
  console.log(`✓ Movement #${movement5.id}: PENDING restock to 5104W — needs approval`)
  console.log(`✓ Movement #${movement6.id}: PENDING restock to 542E — needs approval`)

  // 6) A rejected request
  await prisma.stockMovement.create({
    data: {
      eventId: event.id, type: 'RESTOCK', status: 'REJECTED',
      toBarId: barMap['Suite 512N'].id, createdById: barStaff.id,
      approvedById: sectionMgr.id, notes: 'Suite only has 10 guests — too much requested',
      approvedAt: new Date(Date.now() - 35 * 60000),
      lines: {
        create: [
          { productId: products['Castle Lager'].id, quantityRequested: 48 },
          { productId: products['Heineken'].id, quantityRequested: 24 },
        ],
      },
    },
  })
  console.log('✓ Movement: REJECTED excessive request from 512N\n')

  // ─── SUMMARY ─────────────────────────────────────────
  console.log('═══════════════════════════════════════════')
  console.log('  🍺 Demo seed complete!')
  console.log('═══════════════════════════════════════════')
  console.log('')
  console.log('Login credentials (all use password: changeme123):')
  console.log('')
  console.log('  ADMIN            →  admin@barstock.local')
  console.log('  SECTION_MANAGER  →  manager@barstock.local')
  console.log('  RUNNER           →  runner@barstock.local')
  console.log('  STOCK_ROOM_STAFF →  stockroom@barstock.local')
  console.log('  BAR_STAFF        →  barstaff@barstock.local')
  console.log('  VIEWER           →  viewer@barstock.local')
  console.log('')
  console.log('Demo scenarios ready:')
  console.log('  • 2 PENDING requests    → Log in as manager, approve/reject them')
  console.log('  • 1 APPROVED request    → Log in as stockroom, mark it READY')
  console.log('  • 1 READY request       → Log in as runner, collect & deliver it')
  console.log('  • 1 IN_TRANSIT request  → Log in as runner, mark it delivered')
  console.log('  • 1 DELIVERED request   → View the completed lifecycle')
  console.log('  • 1 REJECTED request    → See how rejections look')
  console.log('  • 3 bars confirmed ✓    → Opening stock matches')
  console.log('  • 1 bar with variance ⚠ → Castle Lager short by 2')
  console.log('  • 11 bars pending       → Awaiting confirmation')
  console.log('  • QR codes page         → Print QR sheets for all suites')
  console.log('  • Stock Room West       → 25 SKUs, partially depleted')
  console.log('  • Stock Room East       → 25 SKUs, partially depleted')
  console.log('')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
