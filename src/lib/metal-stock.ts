import type { Prisma } from "@prisma/client";

type StockLine = { productId: string | null; quantity: number };

/**
 * Descuenta del stock las cantidades de los artículos de un pedido.
 * Se llama cuando un pedido se envía/confirma (sale de BORRADOR).
 * El stock puede quedar negativo: el almacén lo refleja en rojo, no se bloquea el pedido.
 */
export async function applyOrderStock(tx: Prisma.TransactionClient, items: StockLine[]) {
  for (const it of items) {
    if (!it.productId) continue;
    await tx.product.update({
      where: { id: it.productId },
      data: { stock: { decrement: it.quantity } },
    });
  }
}

/**
 * Devuelve al stock las cantidades de un pedido (al cancelarlo si ya se había descontado).
 */
export async function restoreOrderStock(tx: Prisma.TransactionClient, items: StockLine[]) {
  for (const it of items) {
    if (!it.productId) continue;
    await tx.product.update({
      where: { id: it.productId },
      data: { stock: { increment: it.quantity } },
    });
  }
}
