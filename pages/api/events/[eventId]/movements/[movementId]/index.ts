import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/permissions'
import { applyMovementToInventory } from '@/lib/inventory'
import { audit } from '@/lib/audit'

// PENDING → APPROVED/REJECTED (by SECTION_MANAGER or ADMIN)
// APPROVED → READY (by STOCK_ROOM_STAFF or ADMIN)
// READY → IN_TRANSIT (by RUNNER or ADMIN)
// IN_TRANSIT → DELIVERED (by RUNNER or ADMIN)
// Any non-DELIVERED → CANCELLED (by ADMIN or creator)

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['READY', 'CANCELLED'],
  READY: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
}

// Which roles can trigger which transitions
const TRANSITION_ROLES: Record<string, string[]> = {
  APPROVED: ['ADMIN', 'SECTION_MANAGER'],
  REJECTED: ['ADMIN', 'SECTION_MANAGER'],
  READY: ['ADMIN', 'STOCK_ROOM_STAFF'],
  IN_TRANSIT: ['ADMIN', 'RUNNER'],
  DELIVERED: ['ADMIN', 'RUNNER'],
  CANCELLED: ['ADMIN', 'SECTION_MANAGER', 'STOCK_ROOM_STAFF', 'RUNNER', 'BAR_STAFF'],
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
    const { status, notes, lines: lineUpdates, createFollowUp } = req.body

    const movement = await prisma.stockMovement.findUnique({
      where: { id: movementId },
      include: { lines: { include: { product: true } } },
    })
    if (!movement) return res.status(404).json({ error: 'Not found' })

    if (status) {
      const allowed = VALID_TRANSITIONS[movement.status] ?? []
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `Cannot transition from ${movement.status} to ${status}` })
      }
      const allowedRoles = TRANSITION_ROLES[status] ?? ['ADMIN']
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ error: `Only ${allowedRoles.join(' or ')} can mark as ${status}` })
      }
    }

    const now = new Date()
    const updateData: any = {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
      ...(status === 'APPROVED' && { approvedById: userId, approvedAt: now }),
      ...(status === 'IN_TRANSIT' && { dispatchedAt: now }),
      ...(status === 'DELIVERED' && { deliveredAt: now }),
    }

    // Apply line actuals (allowed at both APPROVED→READY and IN_TRANSIT→DELIVERED stages)
    const lineUpdateMap: Record<number, { quantityActual: number; totsActual?: number }> = {}
    if (lineUpdates && Array.isArray(lineUpdates)) {
      for (const lu of lineUpdates) {
        const actualQty = Number(lu.quantityActual)
        lineUpdateMap[lu.id] = { quantityActual: actualQty }
        await prisma.movementLine.update({
          where: { id: lu.id },
          data: {
            quantityActual: actualQty,
            ...(lu.totsActual != null && { totsActual: Number(lu.totsActual) }),
          },
        })
        if (lu.totsActual != null) lineUpdateMap[lu.id].totsActual = Number(lu.totsActual)
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
      if (status === 'DELIVERED') {
        await applyMovementToInventory(tx, movementId)
      }
      return m
    })

    // Create a follow-up PENDING request for any shortfall lines
    if (createFollowUp && status === 'READY') {
      const shortfallLines = movement.lines.filter(line => {
        const sentQty = lineUpdateMap[line.id]?.quantityActual ?? line.quantityActual ?? line.quantityRequested
        return sentQty < line.quantityRequested
      })

      if (shortfallLines.length > 0) {
        await prisma.stockMovement.create({
          data: {
            eventId: movement.eventId,
            type: 'RESTOCK',
            status: 'PENDING',
            toBarId: movement.toBarId,
            createdById: userId,
            notes: `Follow-up for #${movementId} — partial stock shortfall`,
            lines: {
              create: shortfallLines.map(line => {
                const sentQty = lineUpdateMap[line.id]?.quantityActual ?? line.quantityActual ?? line.quantityRequested
                return {
                  productId: line.productId,
                  quantityRequested: line.quantityRequested - sentQty,
                }
              }),
            },
          },
        })
        audit(userId, 'movement.created' as any, 'StockMovement', movementId, {
          reason: 'follow_up_shortfall', parentMovementId: movementId,
        })
      }
    }

    if (status) {
      const actionMap: Record<string, string> = {
        APPROVED: 'movement.approved', REJECTED: 'movement.rejected',
        READY: 'movement.ready', IN_TRANSIT: 'movement.in_transit', DELIVERED: 'movement.delivered',
      }
      const action = actionMap[status]
      if (action) audit(userId, action as any, 'StockMovement', movementId, { from: movement.status, to: status })
    }

    return res.json(updated)
  }

  res.setHeader('Allow', ['GET', 'PATCH'])
  res.status(405).end()
}
