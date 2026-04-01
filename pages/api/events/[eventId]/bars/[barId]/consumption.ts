import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/permissions'

/**
 * Per-bar consumption summary.
 * For each product: opening + restocks received - transfers out - closeouts = system on hand
 * system on hand - closing count = consumed
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  const barId = Number(req.query.barId)
  if (isNaN(barId)) return res.status(400).json({ error: 'Invalid barId' })

  const bar = await prisma.bar.findUnique({
    where: { id: barId },
    include: {
      inventory: { include: { product: true } },
      closingCounts: true,
    },
  })
  if (!bar) return res.status(404).json({ error: 'Not found' })

  // All DELIVERED movements that touch this bar
  const movements = await prisma.stockMovement.findMany({
    where: {
      status: 'DELIVERED',
      OR: [{ toBarId: barId }, { fromBarId: barId }],
    },
    include: { lines: { include: { product: true } } },
  })

  const closingMap: Record<number, number> = {}
  bar.closingCounts.forEach(c => { closingMap[c.productId] = c.closingQuantity })

  const rows = bar.inventory.map(inv => {
    let restocksReceived = 0
    let transfersIn = 0
    let transfersOut = 0
    let closeOuts = 0

    for (const m of movements) {
      for (const line of m.lines) {
        if (line.productId !== inv.productId) continue
        const qty = line.quantityActual ?? line.quantityRequested
        if (m.type === 'RESTOCK' && m.toBarId === barId) restocksReceived += qty
        if (m.type === 'TRANSFER' && m.toBarId === barId) transfersIn += qty
        if (m.type === 'TRANSFER' && m.fromBarId === barId) transfersOut += qty
        if (m.type === 'CLOSE_OUT' && m.fromBarId === barId) closeOuts += qty
      }
    }

    const totalIn = inv.openingQuantity + restocksReceived + transfersIn
    const totalOut = transfersOut + closeOuts
    const systemOnHand = inv.currentQuantity          // already kept up-to-date by applyMovementToInventory
    const closingCount = closingMap[inv.productId] ?? null
    const consumed = closingCount !== null ? systemOnHand - closingCount : null

    return {
      productId: inv.productId,
      productName: inv.product.name,
      unit: inv.product.unit,
      category: inv.product.category,
      opening: inv.openingQuantity,
      restocksReceived,
      transfersIn,
      transfersOut,
      closeOuts,
      totalIn,
      totalOut,
      systemOnHand,
      closingCount,
      consumed,            // null = not yet counted; negative = more on hand than expected (stock gain)
    }
  })

  return res.json({
    barId: bar.id,
    barName: bar.name,
    hasClosingCount: bar.closingCounts.length > 0,
    closingCountedBy: bar.closingCounts[0]?.countedBy ?? null,
    products: rows.sort((a, b) => (a.category ?? '').localeCompare(b.category ?? '') || a.productName.localeCompare(b.productName)),
  })
}
