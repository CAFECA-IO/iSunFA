import { IEventEntity } from '@/interfaces/event';
import { ILineItemEntity } from '@/interfaces/line_item';
import { AccountCodesOfAR, AccountCodesOfAP } from '@/constants/asset';

export const voucherAPIGetOneUtils = {
  isLineItemMatchesAccountDirection: (
    lineItem: ILineItemEntity,
    option: {
      isSameDebitAsAccount: boolean;
      accountSet: Set<string>;
    }
  ) => {
    const { isSameDebitAsAccount, accountSet } = option;
    if (!lineItem.account) return false;

    if (!accountSet.has(lineItem.account.code)) return false;

    if (isSameDebitAsAccount) {
      return lineItem.debit === lineItem.account.debit;
    } else {
      return lineItem.debit !== lineItem.account.debit;
    }
  },

  setLineItemIntoMap: (lineItems: ILineItemEntity, map: Map<string, ILineItemEntity>) => {
    if (!lineItems.account) return;

    if (map.has(lineItems.account.code)) {
      const originalLineItem = map.get(lineItems.account.code);
      if (originalLineItem) {
        originalLineItem.amount += lineItems.amount;
      }
    } else {
      map.set(lineItems.account.code, lineItems);
    }
  },

  /**
   * Info: (20241105 - Murky)
   * @todo 把這個函數拆開
   */
  getPayableReceivableInfo: (event: IEventEntity) => {
    const apSet = new Set(AccountCodesOfAP);
    const arSet = new Set(AccountCodesOfAR);
    const originalARLineItem: Map<string, ILineItemEntity> = new Map();
    const originalAPLineItem: Map<string, ILineItemEntity> = new Map();

    const revertARLineItem: Map<string, ILineItemEntity> = new Map();
    const revertAPLineItem: Map<string, ILineItemEntity> = new Map();

    event.associateVouchers.forEach((associateVoucher) => {
      // Info: (20241105 - Murky) 把和Account 同向的 lineItem 且是可以反轉的 lineItem 存起來
      associateVoucher.originalVoucher.lineItems.forEach((lineItem) => {
        if (
          voucherAPIGetOneUtils.isLineItemMatchesAccountDirection(lineItem, {
            isSameDebitAsAccount: true,
            accountSet: arSet,
          })
        ) {
          voucherAPIGetOneUtils.setLineItemIntoMap(lineItem, originalARLineItem);
        } else if (
          voucherAPIGetOneUtils.isLineItemMatchesAccountDirection(lineItem, {
            isSameDebitAsAccount: true,
            accountSet: apSet,
          })
        ) {
          voucherAPIGetOneUtils.setLineItemIntoMap(lineItem, originalAPLineItem);
        }
      });

      associateVoucher.resultVoucher.lineItems.forEach((lineItem) => {
        if (
          voucherAPIGetOneUtils.isLineItemMatchesAccountDirection(lineItem, {
            isSameDebitAsAccount: false,
            accountSet: arSet,
          })
        ) {
          voucherAPIGetOneUtils.setLineItemIntoMap(lineItem, revertARLineItem);
        } else if (
          voucherAPIGetOneUtils.isLineItemMatchesAccountDirection(lineItem, {
            isSameDebitAsAccount: false,
            accountSet: apSet,
          })
        ) {
          voucherAPIGetOneUtils.setLineItemIntoMap(lineItem, revertAPLineItem);
        }
      });
    });

    const payableInfo = {
      total: 0,
      alreadyHappened: 0,
      remain: 0,
    };

    // ToDo: (20241105 - Murky) 需要refactor
    Array.from(originalAPLineItem.keys()).forEach((key) => {
      const lineItem = originalAPLineItem.get(key);
      if (lineItem) {
        payableInfo.total += lineItem.amount;
        payableInfo.remain += lineItem.amount;
      }
    });

    Array.from(revertAPLineItem.keys()).forEach((key) => {
      const lineItem = revertAPLineItem.get(key);
      if (lineItem) {
        if (originalAPLineItem.has(key)) {
          payableInfo.alreadyHappened += lineItem.amount;
          payableInfo.remain -= lineItem.amount;
        }
      }
    });

    const receivingInfo = {
      total: 0,
      alreadyHappened: 0,
      remain: 0,
    };

    Array.from(originalARLineItem.keys()).forEach((key) => {
      const lineItem = originalARLineItem.get(key);
      if (lineItem) {
        receivingInfo.total += lineItem.amount;
        receivingInfo.remain += lineItem.amount;
      }
    });

    Array.from(revertARLineItem.keys()).forEach((key) => {
      const lineItem = revertARLineItem.get(key);
      if (lineItem) {
        if (originalARLineItem.has(key)) {
          receivingInfo.alreadyHappened += lineItem.amount;
          receivingInfo.remain -= lineItem.amount;
        }
      }
    });

    return {
      payableInfo,
      receivingInfo,
    };
  },
};
