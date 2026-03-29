import { prisma } from './prisma'

/**
 * Called inside a Prisma transaction when a StockMovement transitions to DELIVERED.
 * Updates BarInventory tallies for all lines in the movement.
 */
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

    if (movement.type === 'INITIAL_ALLOCATION' || movement.type === 'RESTOCK') {
      // Increment destination bar inventory
      if (!movement.toBarId) continue
      await tx.barInventory.upsert({
        where: { barId_productId: { barId: movement.toBarId, productId: line.productId } },
        create: {
          barId: movement.toBarId,
          productId: line.productId,
          openingQuantity: movement.type === 'INITIAL_ALLOCATION' ? qty : 0,
          currentQuantity: qty,
        },
        update: {
          openingQuantity:
            movement.type === 'INITIAL_ALLOCATION'
              ? { increment: qty }
              : undefined,
          currentQuantity: { increment: qty },
        },
      })
    } else if (movement.type === 'TRANSFER' || movement.type === 'CLOSE_OUT') {
      // Decrement source bar
      if (movement.fromBarId) {
        await tx.barInventory.upsert({
          where: { barId_productId: { barId: movement.fromBarId, productId: line.productId } },
          create: {
            barId: movement.fromBarId,
            productId: line.productId,
            openingQuantity: 0,
            currentQuantity: 0,
          },
          update: { currentQuantity: { decrement: qty } },
        })
      }
      // Increment destination bar (if redistributing to another bar, not central)
      if (movement.toBarId) {
        await tx.barInventory.upsert({
          where: { barId_productId: { barId: movement.toBarId, productId: line.productId } },
          create: {
            barId: movement.toBarId,
            productId: line.productId,
            openingQuantity: 0,
            currentQuantity: qty,
          },
          update: { currentQuantity: { increment: qty } },
        })
      }
    }
  }
}
