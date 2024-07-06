import prisma from '@/client';
import { IPaymentRecord } from '@/interfaces/payment_record';
import { timestampInSeconds } from '@/lib/utils/common';

// Create
export async function createPaymentRecord(
  orderId: number,
  transactionId: string,
  date: number,
  description: string,
  amount: number,
  method: string,
  status: string
): Promise<IPaymentRecord> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newPaymentRecord = await prisma.paymentRecord.create({
    data: {
      orderId,
      transactionId,
      date,
      description,
      amount,
      method,
      status,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });
  return newPaymentRecord;
}

// Read
export async function getPaymentRecordById(id: number): Promise<IPaymentRecord | null> {
  let paymentRecord = null;
  if (id > 0) {
    paymentRecord = await prisma.paymentRecord.findUnique({
      where: {
        id,
      },
    });
  }

  return paymentRecord;
}

// List
export async function listPaymentRecords(orderId: number): Promise<IPaymentRecord[]> {
  const listedPaymentRecords = await prisma.paymentRecord.findMany({
    where: {
      orderId,
    },
  });
  return listedPaymentRecords;
}

export async function deletePaymentRecord(id: number): Promise<IPaymentRecord> {
  const deletedPaymentRecord = await prisma.paymentRecord.delete({
    where: {
      id,
    },
  });
  return deletedPaymentRecord;
}
