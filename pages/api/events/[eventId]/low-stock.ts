import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/permissions'

/** Fraction of opening stock below which an item is considered low */
const LOW_STOCK_THRESHOLD = 0.2

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
    where: {
      bar: { eventId },
      openingQuantity: { gt: 0 },
    },
    include: {
      bar: { select: { id: true, name: true, barType: true } },
      product: { select: { id: true, name: true, unit: true, category: true } },
    },
  })

  const lowStock = inventory
    .filter((item) => item.currentQuantity <= item.openingQuantity * LOW_STOCK_THRESHOLD)
    .map((item) => ({
      barId: item.bar.id,
      barName: item.bar.name,
      barType: item.bar.barType,
      productId: item.product.id,
      productName: item.product.name,
      productUnit: item.product.unit,
      category: item.product.category,
      openingQuantity: item.openingQuantity,
      currentQuantity: item.currentQuantity,
      percentRemaining: Math.round((item.currentQuantity / item.openingQuantity) * 100),
    }))
    .sort((a, b) => a.percentRemaining - b.percentRemaining)

  return res.json(lowStock)
}
