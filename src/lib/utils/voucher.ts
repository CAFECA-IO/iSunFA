import { IVoucherDataForSavingToDB } from "@/interfaces/voucher";

export function isVoucherAmountGreaterOrEqualThenPaymentAmount(
  voucher: IVoucherDataForSavingToDB,
  paymentAmount: number
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
  const isDebitCreditGreaterOrEqualPaymentAmount = debitAmount >= paymentAmount && creditAmount >= paymentAmount;

  return isDebitCreditEqual && isDebitCreditGreaterOrEqualPaymentAmount;
}
