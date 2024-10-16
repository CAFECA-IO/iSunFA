import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';

export function isVoucherAmountGreaterOrEqualThenPaymentAmount(
  voucher: IVoucherDataForSavingToDB,
  price: number
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

  const isDebitCreditEqual = debitAmount === creditAmount;
  const isDebitCreditGreaterOrEqualPaymentAmount = debitAmount >= price && creditAmount >= price;

  return isDebitCreditEqual && isDebitCreditGreaterOrEqualPaymentAmount;
}
