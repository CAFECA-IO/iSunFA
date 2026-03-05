import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAnalysisCost, IOrderParams } from '@/lib/analysis/pricing';
import { ApiCode } from '@/lib/utils/status';
import { AppError } from '@/lib/utils/error';

import { ORDER_STATUS } from '@/constants/status';

export interface IOrderResult {
  orderId: string;
  challenge: string;
  cost: number;
}

export class OrderGenerator {
  // Info: (20260128 - Luphia) Generate an order for analysis and return the challenge string to be signed.
  async generateAnalysisOrder(userId: string, params: IOrderParams): Promise<IOrderResult> {
    const cost = getAnalysisCost(params);

    const orderData = {
      ...params,
      amount: cost,
      timestamp: new Date().toISOString()
    };

    // Info: (20260128 - Luphia) Create challenge from hashed JSON data
    const jsonString = JSON.stringify(orderData);
    const hash = createHash('sha256').update(jsonString);
    const challenge = hash.digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Info: (20260128 - Luphia) Create PENDING order
    const order = await prisma.order.create({
      data: {
        userId,
        type: 'ANALYSIS',
        amount: cost,
        // Info: (20260128 - Luphia) Store the full data object including timestamp
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: orderData as any,
        status: ORDER_STATUS.PENDING,
        challenge: challenge,
      },
    });

    return {
      orderId: order.id,
      challenge: challenge,
      cost,
    };
  }

  /**
   * Info: (20260128 - Luphia)
   * Verify that the order exists, belongs to the user, and matches the signature.
   * Note: The actual signature verification (crypto) happens in WebAuthnService.
   * This method verifies the business logic (order status, ownership).
   */
  async getPendingOrder(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError(ApiCode.NOT_FOUND, 'Order not found');
    }

    if (order.userId !== userId) {
      throw new AppError(ApiCode.FORBIDDEN, 'Order does not belong to user');
    }

    if (order.status !== ORDER_STATUS.PENDING) {
      throw new AppError(ApiCode.VALIDATION_ERROR, 'Order is not pending');
    }

    return order;
  }

  async completeOrder(orderId: string, signature: string, transactionHash?: string) {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.COMPLETED,
          signature: signature,
          transactionHash: transactionHash
        }
      });

      await tx.receipt.create({
        data: {
          orderId: order.id,
          amount: order.amount,
        }
      });
    });
  }

  async failOrder(orderId: string, reason: string) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.FAILED,
        data: { reason } // Info: (20260128 - Luphia) Basic way to append data? Or just status.
      }
    })
  }
}

export const orderGenerator = new OrderGenerator();
