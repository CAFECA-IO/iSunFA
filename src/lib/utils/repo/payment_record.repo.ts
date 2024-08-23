import prisma from '@/client';
import { IPaymentRecord } from '@/interfaces/payment_record';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Prisma } from '@prisma/client';

// Info: (20240620 - Jacky) Create
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

// Info: (20240620 - Jacky) Read
export async function getPaymentRecordById(id: number): Promise<IPaymentRecord | null> {
  let paymentRecord = null;
  if (id > 0) {
    paymentRecord = await prisma.paymentRecord.findUnique({
      where: {
        id,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });
  }

  return paymentRecord;
}

// Info: (20240620 - Jacky) List
export async function listPaymentRecords(orderId: number): Promise<IPaymentRecord[]> {
  const listedPaymentRecords = await prisma.paymentRecord.findMany({
    where: {
      orderId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
  });
  return listedPaymentRecords;
}

export async function deletePaymentRecord(id: number): Promise<IPaymentRecord> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.PaymentRecordWhereUniqueInput = {
    id,
    deletedAt: null,
  };

  const data: Prisma.PaymentRecordUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const updateArgs: Prisma.PaymentRecordUpdateArgs = {
    where,
    data,
  };
  const deletedPaymentRecord = await prisma.paymentRecord.update(updateArgs);
  return deletedPaymentRecord;
}

// Info: (20240723 - Murky) Real delete for testing
export async function deletePaymentRecordForTesting(id: number): Promise<IPaymentRecord> {
  const where: Prisma.PaymentRecordWhereUniqueInput = {
    id,
  };

  const deletedPaymentRecord = await prisma.paymentRecord.delete({
    where,
  });

  return deletedPaymentRecord;
}
