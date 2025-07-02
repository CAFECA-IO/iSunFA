import { ITeamOrder } from '@/interfaces/order';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { getTimestampNow } from '@/lib/utils/common';
import { ISUNFA } from '@/constants/common';
import { TAX_RATIO } from '@/constants/tax';
import { ITeamInvoice, ITeamPaymentTransaction } from '@/interfaces/payment';
import { IUser } from '@/interfaces/user';

export const generateTeamInvoice = async (
  order: ITeamOrder,
  transaction: ITeamPaymentTransaction,
  payer: IUser
): Promise<ITeamInvoice> => {
  const nowInSecond = getTimestampNow();
  const invoiceCode = ISUNFA + transaction.id;
  const teamOrderId = order.id;
  const teamPaymentTransactionId = transaction.id;
  const { currency, amount } = order;
  // Info: (20250328 - Luphia) 稅金採用總價內扣
  const tax = Math.ceil((amount / (1 + TAX_RATIO.TAIWAN_NORMAL)) * TAX_RATIO.TAIWAN_NORMAL);
  const price = amount - tax;
  const total = amount;
  const payerId = payer.id.toString();
  const payerName = payer.name;
  const payerEmail = payer.email;
  const payerAddress = payer.email;
  const payerPhone = payer.email;
  if (!teamOrderId || !teamPaymentTransactionId) throw new Error(STATUS_MESSAGE.INVALID_INVOICE_GENERATION_DATA);

  const invoice: ITeamInvoice = {
    id: order.id,
    teamOrderId,
    teamPaymentTransactionId,
    invoiceCode,
    price,
    tax,
    total,
    currency,
    payerId,
    payerName,
    payerEmail,
    payerAddress,
    payerPhone,
    status: transaction.status,
    issuedAt: nowInSecond,
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
  };
  return invoice;
};
