import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { Payment } from '@prisma/client';

export function isVoucherAmountGreaterOrEqualThenPaymentAmount(
  voucher: IVoucherDataForSavingToDB,
  payment: Payment
): boolean {
  let debitAmount = 0;
  let creditAmount = 0;

  voucher.lineItems.forEach((lineItem) => {
    if (lineItem.debit) {
      debitAmount += lineItem.amount;
    } else {
      creditAmount += lineItem.amount;
    }
  });

  const paymentAmount = payment.price;

  const isDebitCreditEqual = debitAmount === creditAmount;
  const isDebitCreditGreaterOrEqualPaymentAmount =
    debitAmount >= paymentAmount && creditAmount >= paymentAmount;

  return isDebitCreditEqual && isDebitCreditGreaterOrEqualPaymentAmount;
}
