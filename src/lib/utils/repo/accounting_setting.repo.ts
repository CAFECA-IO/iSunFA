import prisma from '@/client';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import { loggerError } from '@/lib/utils/logger_back';
import { getTimestampNow } from '@/lib/utils/common';
import { DEFAULT_ACCOUNTING_SETTING } from '@/constants/setting';

export async function createAccountingSetting(companyId: number) {
  let accountingSetting = null;

  try {
    accountingSetting = await prisma.accountingSetting.create({
      data: {
        companyId,
        salesTaxTaxable: DEFAULT_ACCOUNTING_SETTING.SALES_TAX_TAXABLE,
        salesTaxRate: DEFAULT_ACCOUNTING_SETTING.SALES_TAX_RATE,
        purchaseTaxTaxable: DEFAULT_ACCOUNTING_SETTING.PURCHASE_TAX_TAXABLE,
        purchaseTaxRate: DEFAULT_ACCOUNTING_SETTING.PURCHASE_TAX_RATE,
        returnPeriodicity: DEFAULT_ACCOUNTING_SETTING.RETURN_PERIODICITY,
        currency: DEFAULT_ACCOUNTING_SETTING.CURRENCY,
      },
      include: { shortcuts: true },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'create accounting setting in createAccountingSetting failed',
      error as Error
    );
    logError.error(
      'Prisma related create accounting setting in createAccountingSetting in accounting_setting.repo.ts failed'
    );
  }

  return accountingSetting;
}

export async function getAccountingSettingByCompanyId(companyId: number) {
  let accountingSetting = null;

  try {
    accountingSetting = await prisma.accountingSetting.findFirst({
      where: { companyId },
      include: { shortcuts: true },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'get accounting setting in getAccountingSetting failed',
      error as Error
    );
    logError.error(
      'Prisma related get accounting setting in getAccountingSetting in accounting_setting.repo.ts failed'
    );
  }

  return accountingSetting;
}

export async function updateAccountingSettingById(id: number, data: IAccountingSetting) {
  const { taxSettings, currency, shortcutList } = data;
  let accountingSetting = null;
  const nowInSecond = getTimestampNow();

  try {
    await prisma.accountingSetting.update({
      where: { id },
      data: {
        salesTaxTaxable: taxSettings.salesTax.taxable,
        salesTaxRate: taxSettings.salesTax.rate,
        purchaseTaxTaxable: taxSettings.purchaseTax.taxable,
        purchaseTaxRate: taxSettings.purchaseTax.rate,
        returnPeriodicity: taxSettings.returnPeriodicity,
        currency,
      },
    });

    if (shortcutList) {
      await prisma.shortcut.deleteMany({
        where: { accountingSettingId: id },
      });
      await prisma.shortcut.createMany({
        data: shortcutList.map((shortcut) => ({
          accountingSettingId: id,
          actionName: shortcut.action.name,
          description: shortcut.action.description,
          fieldList: JSON.stringify(shortcut.action.fieldList),
          keyList: shortcut.keyList,
          createdAt: nowInSecond,
          updatedAt: nowInSecond,
        })),
      });
      accountingSetting = await getAccountingSettingByCompanyId(data.companyId);
    }
  } catch (error) {
    const logError = loggerError(
      0,
      'update accounting setting in updateAccountingSetting failed',
      error as Error
    );
    logError.error(
      'Prisma related update accounting setting in updateAccountingSetting in accounting_setting.repo.ts failed'
    );
  }

  return accountingSetting;
}

export async function deleteAccountingSettingByIdForTesting(id: number) {
  let accountingSetting = null;

  try {
    accountingSetting = await prisma.accountingSetting.delete({
      where: { id },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'delete accounting setting in deleteAccountingSettingByIdForTesting failed',
      error as Error
    );
    logError.error(
      'Prisma related delete accounting setting in deleteAccountingSettingByIdForTesting in accounting_setting.repo.ts failed'
    );
  }

  return accountingSetting;
}
