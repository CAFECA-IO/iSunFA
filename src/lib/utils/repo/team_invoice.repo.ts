import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ITeamInvoice } from '@/interfaces/payment';

export const createTeamInvoice = async (options: ITeamInvoice): Promise<ITeamInvoice> => {
  const data = {
    teamOrderId: options.teamOrderId,
    teamPaymentTransactionId: options.teamPaymentTransactionId,
    invoiceCode: options.invoiceCode,
    price: options.price,
    tax: options.tax,
    total: options.total,
    currency: options.currency,
    payerId: options.payerId,
    payerName: options.payerName,
    payerEmail: options.payerEmail,
    payerAddress: options.payerAddress,
    payerPhone: options.payerPhone,
    status: options.status,
    issuedAt: options.issuedAt,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  };
  const teamInvoice: ITeamInvoice = (await prisma.teamInvoice.create({
    data,
  })) as ITeamInvoice;

  if (!teamInvoice) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return teamInvoice;
};
