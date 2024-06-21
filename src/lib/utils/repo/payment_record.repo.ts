import prisma from '@/client';
import { IPaymentRecord } from '@/interfaces/payment_record';
import { timestampInSeconds } from '@/lib/utils/common';

// Create
export async function createPaymentRecord(paymentRecord: IPaymentRecord): Promise<IPaymentRecord> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newPaymentRecord = await prisma.paymentRecord.create({
    data: {
      orderId: paymentRecord.orderId,
      transactionId: paymentRecord.transactionId,
      date: paymentRecord.date,
      description: paymentRecord.description,
      amount: paymentRecord.amount,
      method: paymentRecord.method,
      status: paymentRecord.status,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });
  return newPaymentRecord;
}

// Read
export async function getPaymentRecordById(id: number): Promise<IPaymentRecord> {
  let paymentRecord = {} as IPaymentRecord;
  if (id > 0) {
    const getPaymentRecord = (await prisma.paymentRecord.findUnique({
      where: {
        id,
      },
    })) as IPaymentRecord;
    paymentRecord = getPaymentRecord;
  }

  return paymentRecord;
}

// Update
export async function updatePaymentRecord(
  id: number,
  transactionId: string,
  date: number,
  description: string,
  amount: number,
  method: string,
  status: string
): Promise<IPaymentRecord> {
  let paymentRecord = {} as IPaymentRecord;
  if (id > 0) {
    const now = Date.now();
    const nowTimestamp = timestampInSeconds(now);
    const updatedPaymentRecord = await prisma.paymentRecord.update({
      where: {
        id,
      },
      data: {
        transactionId,
        date,
        description,
        amount,
        method,
        status,
        updatedAt: nowTimestamp,
      },
    });
    paymentRecord = updatedPaymentRecord;
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
