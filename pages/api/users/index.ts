import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized, requireRole } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return
  if (!requireRole(res, session, ['ADMIN'])) return

  if (req.method === 'GET') {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { name: 'asc' },
    })
    return res.json(users)
  }

  if (req.method === 'POST') {
    const { email, password, name, role } = req.body
    if (!email || !password || !name || !role)
      return res.status(400).json({ error: 'All fields required' })
    const passwordHash = await bcrypt.hash(password, 10)
    try {
      const user = await prisma.user.create({
        data: { email: email.toLowerCase(), passwordHash, name, role },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      })
      return res.status(201).json(user)
    } catch {
      return res.status(409).json({ error: 'Email already in use' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
