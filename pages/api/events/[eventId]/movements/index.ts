import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  const eventId = Number(req.query.eventId)
  if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid eventId' })

  if (req.method === 'GET') {
    const { type, status, barId } = req.query
    const movements = await prisma.stockMovement.findMany({
      where: {
        eventId,
        ...(type && { type: String(type) }),
        ...(status && { status: String(status) }),
        ...(barId && {
          OR: [
            { fromBarId: Number(barId) },
            { toBarId: Number(barId) },
          ],
        }),
      },
      include: {
        fromBar: { select: { id: true, name: true } },
        toBar: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        lines: { include: { product: { select: { name: true, unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(movements)
  }

  if (req.method === 'POST') {
    const userId = Number((session.user as any).id)
    const { type, fromBarId, toBarId, notes, lines } = req.body

    if (!type || !lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'type and lines are required' })
    }

    // Validate role permissions per movement type
    const role = (session.user as any).role
    if (type === 'INITIAL_ALLOCATION' && !['ADMIN', 'RUNNER'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (type === 'RESTOCK' && !['ADMIN', 'BAR_MANAGER', 'RUNNER'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (['TRANSFER', 'CLOSE_OUT'].includes(type) && !['ADMIN', 'RUNNER'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // INITIAL_ALLOCATION is auto-approved and delivered (admin action, no approval flow)
    const isImmediate = type === 'INITIAL_ALLOCATION'

    const movement = await prisma.stockMovement.create({
      data: {
        eventId,
        type,
        status: isImmediate ? 'DELIVERED' : 'PENDING',
        fromBarId: fromBarId || null,
        toBarId: toBarId || null,
        createdById: userId,
        approvedById: isImmediate ? userId : null,
        notes,
        approvedAt: isImmediate ? new Date() : null,
        dispatchedAt: isImmediate ? new Date() : null,
        deliveredAt: isImmediate ? new Date() : null,
        lines: {
          create: lines.map((l: any) => ({
            productId: Number(l.productId),
            quantityRequested: Number(l.quantity),
            quantityActual: isImmediate ? Number(l.quantity) : null,
          })),
        },
      },
      include: {
        lines: { include: { product: true } },
        fromBar: { select: { name: true } },
        toBar: { select: { name: true } },
      },
    })

    // If immediate delivery (initial allocation), update inventory now
    if (isImmediate) {
      const { applyMovementToInventory } = await import('@/lib/inventory')
      await prisma.$transaction(async (tx) => {
        await applyMovementToInventory(tx, movement.id)
      })
    }

    return res.status(201).json(movement)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
