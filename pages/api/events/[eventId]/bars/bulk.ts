import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized, requireRole } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  const eventId = Number(req.query.eventId)
  if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid eventId' })

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  if (!requireRole(res, session, ['ADMIN', 'RUNNER'])) return

  const { bars } = req.body
  if (!Array.isArray(bars) || bars.length === 0) {
    return res.status(400).json({ error: 'bars array required' })
  }

  const created = []
  const skipped = []

  for (const bar of bars) {
    const { name, location, level, foyer, responsibleCompany, stockType, barType } = bar
    if (!name) { skipped.push({ name, reason: 'missing name' }); continue }

    // Build location string from level/foyer/location if provided
    const locationStr = location || [level, foyer].filter(Boolean).join(' · ') || null

    try {
      const created_bar = await prisma.bar.create({
        data: {
          eventId,
          name: String(name).trim(),
          location: locationStr ? String(locationStr).trim() : null,
          responsibleCompany: responsibleCompany ? String(responsibleCompany).trim() : null,
          stockType: stockType || 'PAID',
          barType: barType || 'BAR',
        },
      })
      created.push(created_bar)
    } catch (e: any) {
      if (e.code === 'P2002') {
        skipped.push({ name, reason: 'already exists' })
      } else {
        skipped.push({ name, reason: 'error' })
      }
    }
  }

  return res.status(201).json({ created: created.length, skipped })
}
