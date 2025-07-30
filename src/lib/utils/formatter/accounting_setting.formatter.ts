import { CurrencyType } from '@/constants/currency';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import { AccountingSetting, Shortcut } from '@prisma/client';

export function formatAccountingSetting(
  accountingSetting: AccountingSetting & { shortcuts: Shortcut[] }
): IAccountingSetting {
  const parseFieldList = (fieldList: string) =>
    JSON.parse(fieldList || '[]').map(({ name, value }: { name: string; value: string }) => ({
      name,
      value,
    }));

  const taxSettings: IAccountingSetting['taxSettings'] = {
    salesTax: { taxable: accountingSetting.salesTaxTaxable, rate: accountingSetting.salesTaxRate },
    purchaseTax: {
      taxable: accountingSetting.purchaseTaxTaxable,
      rate: accountingSetting.purchaseTaxRate,
    },
    returnPeriodicity: accountingSetting.returnPeriodicity,
  };

  const shortcutList: IAccountingSetting['shortcutList'] = accountingSetting.shortcuts.map(
    (shortcut) => ({
      action: {
        name: shortcut.actionName,
        description: shortcut.description,
        fieldList: typeof shortcut.fieldList === 'string' ? parseFieldList(shortcut.fieldList) : [],
      },
      keyList: shortcut.keyList,
    })
  );

  return {
    id: accountingSetting.id,
<<<<<<< HEAD
    accountBookId: accountingSetting.accountBookId,
    currency: accountingSetting.currency,
=======
    companyId: accountingSetting.companyId,
    currency: accountingSetting.currency as CurrencyType,
>>>>>>> feature/fix-integration-test-refactoring
    taxSettings,
    shortcutList,
  };
}
