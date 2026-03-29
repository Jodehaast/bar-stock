import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized, requireRole } from '@/lib/permissions'
import { applyMovementToInventory } from '@/lib/inventory'

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  const movementId = Number(req.query.movementId)
  if (isNaN(movementId)) return res.status(400).json({ error: 'Invalid movementId' })

  if (req.method === 'GET') {
    const movement = await prisma.stockMovement.findUnique({
      where: { id: movementId },
      include: {
        fromBar: { select: { id: true, name: true } },
        toBar: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        lines: {
          include: { product: { select: { id: true, name: true, unit: true, category: true } } },
        },
      },
    })
    if (!movement) return res.status(404).json({ error: 'Not found' })
    return res.json(movement)
  }

  if (req.method === 'PATCH') {
    const userId = Number((session.user as any).id)
    const role = (session.user as any).role
    const { status, notes, lines: lineUpdates } = req.body

    const movement = await prisma.stockMovement.findUnique({
      where: { id: movementId },
      include: { lines: true },
    })
    if (!movement) return res.status(404).json({ error: 'Not found' })

    // Validate transition
    if (status) {
      const allowed = VALID_TRANSITIONS[movement.status] ?? []
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `Cannot transition from ${movement.status} to ${status}` })
      }

      // Role checks for transitions
      if (['APPROVED', 'DISPATCHED'].includes(status) && !['ADMIN', 'RUNNER'].includes(role)) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      if (status === 'CANCELLED' && !['ADMIN', 'RUNNER', 'BAR_MANAGER'].includes(role)) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    const now = new Date()
    const updateData: any = {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
      ...(status === 'APPROVED' && { approvedById: userId, approvedAt: now }),
      ...(status === 'DISPATCHED' && { dispatchedAt: now }),
      ...(status === 'DELIVERED' && { deliveredAt: now }),
    }

    // Update quantity actuals on lines if provided
    if (lineUpdates && Array.isArray(lineUpdates)) {
      for (const lu of lineUpdates) {
        await prisma.movementLine.update({
          where: { id: lu.id },
          data: { quantityActual: Number(lu.quantityActual) },
        })
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.stockMovement.update({
        where: { id: movementId },
        data: updateData,
        include: {
          fromBar: { select: { id: true, name: true } },
          toBar: { select: { id: true, name: true } },
          lines: { include: { product: true } },
          createdBy: { select: { name: true } },
          approvedBy: { select: { name: true } },
        },
      })

      // Apply inventory update on delivery
      if (status === 'DELIVERED') {
        await applyMovementToInventory(tx, movementId)
      }

      return m
    })

    return res.json(updated)
  }

  res.setHeader('Allow', ['GET', 'PATCH'])
  res.status(405).end()
}
