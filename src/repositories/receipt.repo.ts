import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";
import { buildReceiptDataToSave } from "@/lib/utils/payment_helpers";

export class ReceiptRepo {
  /**
   * Info: (20260410 - Luphia)
   * Retrieves a receipt by its Order ID. If it does not exist, it seamlessly generates one
   * using the Order's final payload.
   *
   * Info: (20260815 - Luphia) `userId` 為**必填**（PR #6652 第二輪 §E）。
   *
   * 原本只憑 orderId 查詢，而端點只檢查「有沒有登入」——任何登入者換一個 order_id
   * 就能取得他人的收據，內含金額、買方姓名與 buyerId。設成必填而非選填，
   * 是為了讓「忘記帶擁有者」在編譯期就不可能發生，而不是靠每個呼叫端自己記得。
   *
   * 查無或不屬於該用戶時一律回 null，**不區分兩者**：區分等於告訴對方
   * 「這張訂單存在，只是不是你的」，那本身就是一則不該外流的資訊。
   */
  async getOrCreateReceipt(orderId: string, userId: string) {
    // Info: (20260815 - Luphia) 先確認擁有者，再取收據——順序反過來就等於沒有檢查
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { user: true },
    });

    if (!order) {
      return null;
    }

    const existingReceipt = await prisma.receipt.findUnique({
      where: { orderId },
    });

    if (existingReceipt) {
      return existingReceipt;
    }

    /* Info: (20260410 - Luphia)
     * Generate missing receipt synchronously with a transaction lock
     * to prevent race conditions from concurrent downloads.
     */
    const newReceipt = await prisma.$transaction(async (tx) => {
      const checkReceipt = await tx.receipt.findUnique({
        where: { orderId },
      });
      if (checkReceipt) return checkReceipt;

      const randomCode = Math.floor(Math.random() * 9000 + 1000).toString();

      const standardizedData = buildReceiptDataToSave(
        order.id,
        order.amount,
        (order.data as Record<string, unknown>) || {},
        undefined,
        order.user,
      );

      const receiptData = {
        ...(typeof order.data === "object" && order.data !== null
          ? order.data
          : {}),
        ...standardizedData,
        randomCode,
      };

      return await tx.receipt.create({
        data: {
          orderId: order.id,
          amount: order.amount,
          data: receiptData as Prisma.InputJsonObject,
        },
      });
    });

    return newReceipt;
  }
}

export const receiptRepo = new ReceiptRepo();
