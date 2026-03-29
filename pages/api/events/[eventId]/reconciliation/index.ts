import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  const eventId = Number(req.query.eventId)
  if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid eventId' })

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  const bars = await prisma.bar.findMany({
    where: { eventId },
    include: {
      inventory: { include: { product: true } },
    },
    orderBy: { name: 'asc' },
  })

  // For each bar, get all delivered movements to compute received/transferred
  const movements = await prisma.stockMovement.findMany({
    where: { eventId, status: 'DELIVERED' },
    include: { lines: { include: { product: true } } },
  })

  const result = bars.map((bar) => {
    const productMap: Record<number, {
      productId: number
      productName: string
      unit: string
      category: string | null
      opening: number
      received: number
      transferredIn: number
      transferredOut: number
      closeOut: number
      current: number
    }> = {}

    // Seed from inventory
    for (const inv of bar.inventory) {
      productMap[inv.productId] = {
        productId: inv.productId,
        productName: inv.product.name,
        unit: inv.product.unit,
        category: inv.product.category,
        opening: inv.openingQuantity,
        received: 0,
        transferredIn: 0,
        transferredOut: 0,
        closeOut: 0,
        current: inv.currentQuantity,
      }
    }

    // Tally movements
    for (const m of movements) {
      for (const line of m.lines) {
        const qty = line.quantityActual ?? line.quantityRequested
        if (!productMap[line.productId]) {
          productMap[line.productId] = {
            productId: line.productId,
            productName: line.product.name,
            unit: line.product.unit,
            category: line.product.category,
            opening: 0, received: 0, transferredIn: 0, transferredOut: 0, closeOut: 0, current: 0,
          }
        }
        const entry = productMap[line.productId]
        if (m.type === 'RESTOCK' && m.toBarId === bar.id) entry.received += qty
        if (m.type === 'TRANSFER' && m.toBarId === bar.id) entry.transferredIn += qty
        if (m.type === 'TRANSFER' && m.fromBarId === bar.id) entry.transferredOut += qty
        if (m.type === 'CLOSE_OUT' && m.fromBarId === bar.id) entry.closeOut += qty
        if (m.type === 'CLOSE_OUT' && m.toBarId === bar.id) entry.transferredIn += qty
      }
    }

    return {
      bar: { id: bar.id, name: bar.name, location: bar.location, status: bar.status },
      products: Object.values(productMap).sort((a, b) =>
        (a.category ?? '').localeCompare(b.category ?? '') || a.productName.localeCompare(b.productName)
      ),
    }
  })

  return res.json(result)
}
