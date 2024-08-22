import { IPaymentBeta } from '@/interfaces/payment';
import prisma from '@/client';
import { Prisma, Payment } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';

/**
 * Create a payment record by IPaymentBeta
 * @param {IPaymentBeta} payment - Payment data that will be created (type: IPaymentBeta)
 * @returns {Promise<Payment | null>} Return a payment record or null (type: Promise<Payment | null>)
 */
export async function createPayment(payment: IPaymentBeta) {
  let result: Payment | null = null;
  const nowInSecond = getTimestampNow();

  const data: Prisma.PaymentCreateInput = {
    ...payment,
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
    deletedAt: null,
  };

  const paymentCreateArgs = {
    data,
  };

  try {
    result = await prisma.payment.create(paymentCreateArgs);
  } catch (error) {
    // Todo: (20240822 - Murky Anna) 使用 logger
  }

  return result;
}

/**
 * Update a payment record (identify by paymentId) by IPaymentBeta
 * @param {number} paymentId - Payment ID that will be updated (type: number)
 * @param {IPaymentBeta} payment - Payment data that will be updated to paymentId provided (type: IPaymentBeta)
 * @returns {Promise<Payment | null>} Return a payment record or null (type: Promise<Payment | null>)
 */
export async function updatePayment(paymentId: number, payment: IPaymentBeta) {
  let result: Payment | null = null;
  const nowInSecond = getTimestampNow();

  const data: Prisma.PaymentUpdateInput = {
    ...payment,
    updatedAt: nowInSecond,
  };

  const where: Prisma.PaymentWhereUniqueInput = {
    id: paymentId,
  };

  const paymentUpdateArgs = {
    where,
    data,
  };

  try {
    result = await prisma.payment.update(paymentUpdateArgs);
  } catch (error) {
    // Todo: (20240822 - Murky Anna) 使用 logger
  }

  return result;
}
