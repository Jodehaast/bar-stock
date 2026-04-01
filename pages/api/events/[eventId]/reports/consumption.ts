import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/permissions'

/**
 * Per-product consumption report for an event.
 * Shows total allocated, total consumed, and remaining per product across all bars.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  const eventId = Number(req.query.eventId)
  if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid eventId' })

  const inventory = await prisma.barInventory.findMany({
    where: { bar: { eventId } },
    include: {
      product: { select: { id: true, name: true, unit: true, category: true } },
    },
  })

  // Aggregate by product
  const byProduct: Record<number, {
    productId: number; name: string; unit: string; category: string | null
    totalOpening: number; totalCurrent: number; consumed: number
  }> = {}

  for (const item of inventory) {
    const p = item.product
    if (!byProduct[p.id]) {
      byProduct[p.id] = { productId: p.id, name: p.name, unit: p.unit, category: p.category, totalOpening: 0, totalCurrent: 0, consumed: 0 }
    }
    byProduct[p.id].totalOpening += item.openingQuantity
    byProduct[p.id].totalCurrent += item.currentQuantity
  }

  for (const row of Object.values(byProduct)) {
    row.consumed = row.totalOpening - row.totalCurrent
  }

  const result = Object.values(byProduct).sort((a, b) => b.consumed - a.consumed)
  return res.json(result)
}
