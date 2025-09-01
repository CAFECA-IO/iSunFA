import { IVoucherBeta } from '@/interfaces/voucher';
import { AccountCodesOfAP, AccountCodesOfAR } from '@/constants/asset';
import { JOURNAL_EVENT } from '@/constants/journal';
import { DecimalOperations } from '@/lib/utils/decimal_operations';

export function isCompleteVoucherBeta(voucher: IVoucherBeta): boolean {
  if (!voucher.lineItemsInfo || voucher.lineItemsInfo.lineItems.length === 0) return false;

  const allValid = voucher.lineItemsInfo.lineItems.every(
    (item) =>
      item.account?.id !== undefined &&
      !DecimalOperations.isZero(item.amount) &&
      (item.description?.trim() ?? '') !== ''
  );

  const debitAmounts = voucher.lineItemsInfo.lineItems
    .filter((item) => item.debit)
    .map((item) => item.amount);
  const totalDebit = DecimalOperations.sum(debitAmounts);

  const creditAmounts = voucher.lineItemsInfo.lineItems
    .filter((item) => !item.debit)
    .map((item) => item.amount);
  const totalCredit = DecimalOperations.sum(creditAmounts);

  return allValid && DecimalOperations.isEqual(totalDebit, totalCredit);
}

export function countIncompleteVouchersByTab(vouchers: IVoucherBeta[]) {
  const result = {
    uploadedVoucher: 0,
    upcomingEvents: 0,
    paymentVoucher: 0,
    receivingVoucher: 0,
  };

  vouchers.forEach((voucher) => {
    if (isCompleteVoucherBeta(voucher)) return;
    if (voucher.deletedAt !== null || voucher.isReverseRelated) return;

    const lineItems = voucher.lineItemsInfo.lineItems || [];

    const hasAPCode = lineItems.some((item) =>
      AccountCodesOfAP.some((prefix) => item.account?.code?.startsWith(prefix))
    );

    const hasARCode = lineItems.some((item) =>
      AccountCodesOfAR.some((prefix) => item.account?.code?.startsWith(prefix))
    );

    if (voucher.status === JOURNAL_EVENT.UPCOMING) {
      result.upcomingEvents += 1;
    } else if (hasAPCode) {
      result.paymentVoucher += 1;
    } else if (hasARCode) {
      result.receivingVoucher += 1;
    } else {
      result.uploadedVoucher += 1;
    }
  });

  return result;
}
