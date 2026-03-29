import { prisma } from './prisma'

export async function applyMovementToInventory(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  movementId: number
) {
  const movement = await tx.stockMovement.findUniqueOrThrow({
    where: { id: movementId },
    include: { lines: true },
  })

  for (const line of movement.lines) {
    const qty = line.quantityActual ?? line.quantityRequested
    const tots = (line as any).totsActual ?? (line as any).totsRequested ?? 0

    if (movement.type === 'INITIAL_ALLOCATION' || movement.type === 'RESTOCK') {
      if (!movement.toBarId) continue
      await tx.barInventory.upsert({
        where: { barId_productId: { barId: movement.toBarId, productId: line.productId } },
        create: {
          barId: movement.toBarId,
          productId: line.productId,
          openingQuantity: movement.type === 'INITIAL_ALLOCATION' ? qty : 0,
          currentQuantity: qty,
          openingTots: movement.type === 'INITIAL_ALLOCATION' ? tots : 0,
          currentTots: tots,
        },
        update: {
          openingQuantity: movement.type === 'INITIAL_ALLOCATION' ? { increment: qty } : undefined,
          currentQuantity: { increment: qty },
          openingTots: movement.type === 'INITIAL_ALLOCATION' ? { increment: tots } : undefined,
          currentTots: { increment: tots },
        },
      })
    } else if (movement.type === 'TRANSFER' || movement.type === 'CLOSE_OUT') {
      if (movement.fromBarId) {
        await tx.barInventory.upsert({
          where: { barId_productId: { barId: movement.fromBarId, productId: line.productId } },
          create: { barId: movement.fromBarId, productId: line.productId, openingQuantity: 0, currentQuantity: 0, openingTots: 0, currentTots: 0 },
          update: { currentQuantity: { decrement: qty }, currentTots: { decrement: tots } },
        })
      }
      if (movement.toBarId) {
        await tx.barInventory.upsert({
          where: { barId_productId: { barId: movement.toBarId, productId: line.productId } },
          create: { barId: movement.toBarId, productId: line.productId, openingQuantity: 0, currentQuantity: qty, openingTots: 0, currentTots: tots },
          update: { currentQuantity: { increment: qty }, currentTots: { increment: tots } },
        })
      }
    }
  }
}
