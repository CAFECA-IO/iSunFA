import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAnalysisCost, IOrderParams } from '@/lib/analysis/pricing';
import { ApiCode } from '@/lib/utils/status';
import { AppError } from '@/lib/utils/error';

import { ORDER_STATUS, ORDER_TYPE } from '@/constants/status';

export interface IOrderResult {
  orderId: string;
  challenge: string;
  cost: number;
}

export interface IPaymentOrderParams {
  amount: number;
  credits: number;
  paymentMethodId: string;
}

export class OrderGenerator {
  // Info: (20260128 - Luphia) Generate an order for analysis and return the challenge string to be signed.
  async generateAnalysisOrder(userId: string, params: IOrderParams): Promise<IOrderResult> {
    // Info: (20260320 - AI) Prerequisite check: Net Zero Emissions requires Carbon Health Check
    if (params.category === 'net_zero_emissions') {
      if (!params.keyword) {
        throw new AppError(ApiCode.VALIDATION_ERROR, 'Missing company info (keyword) for net_zero_emissions');
      }
      const prerequisite = await prisma.analysis.findFirst({
        where: {
          userId,
          type: 'carbon_health_check',
          data: {
            path: ['keyword'],
            equals: params.keyword,
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (!prerequisite) {
        throw new AppError(ApiCode.VALIDATION_ERROR, '必須先完成該企業的「企業碳健檢（Carbon Health Check）」分析，才能產出「淨零碳排（Net Zero Emissions）」報告。');
      }

      const latestNetZero = await prisma.analysis.findFirst({
        where: {
          userId,
          type: 'net_zero_emissions',
          data: {
            path: ['keyword'],
            equals: params.keyword,
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (latestNetZero && prerequisite.createdAt.getTime() <= latestNetZero.createdAt.getTime()) {
        throw new AppError(ApiCode.VALIDATION_ERROR, '您的企業碳健檢資料已過期！請先針對該企業「重新生成一份最新的碳健檢報告」，再產出淨零碳排報告。');
      }
    }

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
        data: orderData,
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

  // Info: (20260305 - Tzuhan) Generate an order for points purchase and return the challenge string to be signed.
  async generatePaymentOrder(userId: string, params: IPaymentOrderParams): Promise<IOrderResult> {
    const orderData = {
      ...params,
      timestamp: new Date().toISOString()
    };

    // Info: (20260305 - Tzuhan) Create challenge from hashed JSON data
    const jsonString = JSON.stringify(orderData);
    const hash = createHash('sha256').update(jsonString);
    const challenge = hash.digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Info: (20260305 - Tzuhan) Create PENDING order
    const order = await prisma.order.create({
      data: {
        userId,
        type: ORDER_TYPE.OEN_PAYMENT,
        amount: params.amount,
        data: orderData,
        status: ORDER_STATUS.PENDING,
        challenge: challenge,
      },
    });

    return {
      orderId: order.id,
      challenge: challenge,
      cost: params.amount,
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
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    const existingData = order?.data ? (order.data as Record<string, unknown>) : {};

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.FAILED,
        data: { ...existingData, failureReason: reason } // Info: (20260304 - Tzuhan) Merge data, don't overwrite
      }
    })
  }
}

export const orderGenerator = new OrderGenerator();
