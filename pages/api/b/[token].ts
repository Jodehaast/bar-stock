import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rateLimit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.query.token as string
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.socket.remoteAddress ?? 'unknown'

  // Rate limit POST requests (restock/confirm): 20 per minute per IP+token
  if (req.method === 'POST') {
    const allowed = checkRateLimit(`qr-post:${ip}:${token}`, { limit: 20, windowSecs: 60 })
    if (!allowed) return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' })
  }

  const bar = await prisma.bar.findUnique({
    where: { accessToken: token },
    include: {
      event: { select: { id: true, name: true, date: true, venue: true, status: true } },
      inventory: {
        include: { product: { select: { id: true, name: true, unit: true, category: true, totsPerBottle: true } } },
        orderBy: { product: { name: 'asc' } },
      },
      confirmations: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
      closingCounts: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
    },
  })

  if (!bar) return res.status(404).json({ error: 'Bar not found' })

  if (req.method === 'GET') {
    return res.json(bar)
  }

  // POST: submit a restock request
  if (req.method === 'POST') {
    const { type, lines, notes, confirmedBy } = req.body

    // Opening stock confirmation
    if (type === 'CONFIRM_OPENING') {
      if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ error: 'No lines provided' })
      }
      // Upsert each confirmation line
      const results = await Promise.all(
        lines.map((line: { productId: number; confirmedQuantity: number; confirmedTots?: number; notes?: string }) =>
          prisma.barStockConfirmation.upsert({
            where: { barId_productId: { barId: bar.id, productId: line.productId } },
            create: {
              barId: bar.id,
              productId: line.productId,
              confirmedQuantity: Number(line.confirmedQuantity) || 0,
              confirmedTots: Number(line.confirmedTots) || 0,
              confirmedBy: confirmedBy || null,
              notes: line.notes || null,
              confirmedAt: new Date(),
            },
            update: {
              confirmedQuantity: Number(line.confirmedQuantity) || 0,
              confirmedTots: Number(line.confirmedTots) || 0,
              confirmedBy: confirmedBy || null,
              notes: line.notes || null,
              confirmedAt: new Date(),
            },
          })
        )
      )
      return res.json({ ok: true, confirmations: results.length })
    }

    // Restock request — needs a system user (use admin as createdBy)
    if (type === 'RESTOCK') {
      if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ error: 'No lines provided' })
      }
      const validLines = lines.filter((l: any) => Number(l.quantityRequested) > 0)
      if (validLines.length === 0) return res.status(400).json({ error: 'All quantities are zero' })

      // Use the bar's assigned manager as createdBy; fall back to first admin
      let systemUserId: number | null = bar.managerId ?? null
      if (!systemUserId) {
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
        if (!admin) return res.status(500).json({ error: 'No admin user found' })
        systemUserId = admin.id
      }

      const movement = await prisma.stockMovement.create({
        data: {
          eventId: bar.eventId,
          type: 'RESTOCK',
          status: 'PENDING',
          toBarId: bar.id,
          createdById: systemUserId,
          notes: notes || `QR request from ${bar.name}${confirmedBy ? ` by ${confirmedBy}` : ''}`,
          lines: {
            create: validLines.map((l: any) => ({
              productId: Number(l.productId),
              quantityRequested: Number(l.quantityRequested),
              totsRequested: Number(l.totsRequested) || 0,
            })),
          },
        },
        include: { lines: { include: { product: true } } },
      })
      return res.json({ ok: true, movementId: movement.id })
    }

    // Closing count — bar staff count of remaining stock at end of shift/event
    if (type === 'CLOSING_COUNT') {
      if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ error: 'No lines provided' })
      }
      const results = await Promise.all(
        lines.map((line: { productId: number; closingQuantity: number; closingTots?: number; notes?: string }) =>
          prisma.barClosingCount.upsert({
            where: { barId_productId: { barId: bar.id, productId: line.productId } },
            create: {
              barId: bar.id,
              productId: line.productId,
              closingQuantity: Number(line.closingQuantity) || 0,
              closingTots: Number(line.closingTots) || 0,
              countedBy: confirmedBy || null,
              notes: line.notes || null,
              submittedAt: new Date(),
            },
            update: {
              closingQuantity: Number(line.closingQuantity) || 0,
              closingTots: Number(line.closingTots) || 0,
              countedBy: confirmedBy || null,
              notes: line.notes || null,
              submittedAt: new Date(),
            },
          })
        )
      )
      return res.json({ ok: true, counts: results.length })
    }

    return res.status(400).json({ error: 'Invalid type' })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
