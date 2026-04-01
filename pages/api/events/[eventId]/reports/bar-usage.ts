import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/permissions'

/**
 * Per-bar usage report.
 * Shows each bar's total stock received, consumed, and remaining.
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

  const bars = await prisma.bar.findMany({
    where: { eventId },
    include: {
      inventory: {
        include: { product: { select: { id: true, name: true, unit: true, category: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  const result = bars.map((bar) => {
    const totalOpening = bar.inventory.reduce((s, i) => s + i.openingQuantity, 0)
    const totalCurrent = bar.inventory.reduce((s, i) => s + i.currentQuantity, 0)
    const consumed = totalOpening - totalCurrent
    const consumptionPct = totalOpening > 0 ? Math.round((consumed / totalOpening) * 100) : 0

    return {
      barId: bar.id,
      barName: bar.name,
      barType: bar.barType,
      stockType: bar.stockType,
      totalOpening,
      totalCurrent,
      consumed,
      consumptionPct,
      skus: bar.inventory.length,
      breakdown: bar.inventory.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        unit: i.product.unit,
        category: i.product.category,
        opening: i.openingQuantity,
        current: i.currentQuantity,
        consumed: i.openingQuantity - i.currentQuantity,
      })).sort((a, b) => b.consumed - a.consumed),
    }
  })

  return res.json(result)
}
