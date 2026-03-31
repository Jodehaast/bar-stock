import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return
  if (req.method !== 'GET') return res.status(405).end()

  const eventId = Number(req.query.eventId)
  if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid eventId' })

  const bars = await prisma.bar.findMany({
    where: { eventId },
    include: {
      inventory: {
        include: { product: { select: { id: true, name: true, unit: true, totsPerBottle: true, category: true } } },
      },
      confirmations: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Build comparison: for each bar, compare allocated vs confirmed per product
  const summary = bars.map(bar => {
    const confirmedMap: Record<number, { confirmedQuantity: number; confirmedTots: number; confirmedBy: string | null; confirmedAt: Date }> = {}
    bar.confirmations.forEach(c => {
      confirmedMap[c.productId] = {
        confirmedQuantity: c.confirmedQuantity,
        confirmedTots: c.confirmedTots,
        confirmedBy: c.confirmedBy,
        confirmedAt: c.confirmedAt,
      }
    })

    const lines = bar.inventory
      .filter(i => i.openingQuantity > 0 || i.openingTots > 0)
      .map(i => {
        const conf = confirmedMap[i.productId]
        const variance = conf ? conf.confirmedQuantity - i.openingQuantity : null
        const totsVariance = conf ? conf.confirmedTots - i.openingTots : null
        return {
          product: i.product,
          allocated: i.openingQuantity,
          allocatedTots: i.openingTots,
          confirmed: conf?.confirmedQuantity ?? null,
          confirmedTots: conf?.confirmedTots ?? null,
          variance,
          totsVariance,
          ok: variance === 0 && totsVariance === 0,
        }
      })

    const hasVariance = lines.some(l => l.variance !== null && l.variance !== 0)
    const pendingConfirmation = lines.some(l => l.confirmed === null)

    return {
      bar: {
        id: bar.id,
        name: bar.name,
        location: bar.location,
        barType: bar.barType,
        accessToken: bar.accessToken,
      },
      confirmedBy: bar.confirmations[0]?.confirmedBy ?? null,
      confirmedAt: bar.confirmations[0]?.confirmedAt ?? null,
      lines,
      hasVariance,
      pendingConfirmation,
      totalAllocated: lines.reduce((s, l) => s + l.allocated, 0),
      totalConfirmed: lines.filter(l => l.confirmed !== null).reduce((s, l) => s + (l.confirmed ?? 0), 0),
    }
  })

  return res.json(summary)
}
