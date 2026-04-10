import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import { buildReceiptDataToSave } from "@/lib/utils/payment_helpers";

export class ReceiptRepo {
  /**
   * Info: (20260410 - Luphia)
   * Retrieves a receipt by its Order ID. If it does not exist, it seamlessly generates one 
   * using the Order's final payload.
   */
  async getOrCreateReceipt(orderId: string) {
    const existingReceipt = await prisma.receipt.findUnique({
      where: { orderId }
    });

    if (existingReceipt) {
      return existingReceipt;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    /* Info: (20260410 - Luphia)
     * Generate missing receipt synchronously with a transaction lock
     * to prevent race conditions from concurrent downloads.
    */
    const newReceipt = await prisma.$transaction(async (tx) => {
      const checkReceipt = await tx.receipt.findUnique({
        where: { orderId }
      });
      if (checkReceipt) return checkReceipt;

      const randomCode = Math.floor(Math.random() * 9000 + 1000).toString();
      
      const standardizedData = buildReceiptDataToSave(
        order.id,
        order.amount,
        (order.data as Record<string, unknown>) || {},
        undefined,
        order.user
      );
      
      const receiptData = {
        ...(typeof order.data === 'object' && order.data !== null ? order.data : {}),
        ...standardizedData,
        randomCode
      };

      return await tx.receipt.create({
        data: {
          orderId: order.id,
          amount: order.amount,
          data: receiptData as Prisma.InputJsonObject
        }
      });
    });

    return newReceipt;
  }
}

export const receiptRepo = new ReceiptRepo();
