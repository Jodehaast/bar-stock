import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized, requireRole } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  const eventId = Number(req.query.eventId)
  if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid eventId' })

  if (req.method === 'GET') {
    // Return central stock with how much has been allocated to bars
    const stock = await prisma.eventCentralStock.findMany({
      where: { eventId },
      include: { product: true },
      orderBy: [{ product: { category: 'asc' } }, { product: { name: 'asc' } }],
    })

    // Sum allocations (INITIAL_ALLOCATION movements toBarId != null, status DELIVERED)
    const allocations = await prisma.movementLine.findMany({
      where: {
        movement: {
          eventId,
          type: 'INITIAL_ALLOCATION',
          status: 'DELIVERED',
        },
      },
      include: { movement: true },
    })

    const allocatedByProduct: Record<number, number> = {}
    for (const line of allocations) {
      allocatedByProduct[line.productId] = (allocatedByProduct[line.productId] ?? 0) + line.quantityActual!
    }

    const result = stock.map((s) => ({
      id: s.id,
      productId: s.productId,
      productName: s.product.name,
      unit: s.product.unit,
      category: s.product.category,
      quantity: s.quantity,
      allocated: allocatedByProduct[s.productId] ?? 0,
      remaining: s.quantity - (allocatedByProduct[s.productId] ?? 0),
    }))

    return res.json(result)
  }

  if (req.method === 'POST') {
    // Bulk upsert from CSV upload
    if (!requireRole(res, session, ['ADMIN', 'RUNNER'])) return
    const { entries } = req.body
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array required' })
    }

    const results = []
    for (const entry of entries) {
      const { productId, quantity } = entry
      if (!productId || quantity == null) continue
      const record = await prisma.eventCentralStock.upsert({
        where: { eventId_productId: { eventId, productId: Number(productId) } },
        create: { eventId, productId: Number(productId), quantity: Number(quantity) },
        update: { quantity: Number(quantity) },
      })
      results.push(record)
    }
    return res.status(201).json(results)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
