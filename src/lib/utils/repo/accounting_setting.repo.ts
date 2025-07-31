import prisma from '@/client';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import { loggerError } from '@/lib/utils/logger_back';
import { getTimestampNow } from '@/lib/utils/common';
import { DEFAULT_ACCOUNTING_SETTING } from '@/constants/setting';
import { DefaultValue } from '@/constants/default_value';

export async function createAccountingSetting(accountBookId: number) {
  let accountingSetting = null;

  try {
    accountingSetting = await prisma.accountingSetting.create({
      data: {
        accountBookId,
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'create accounting setting in createAccountingSetting failed',
      errorMessage: (error as Error).message,
    });
  }

  return accountingSetting;
}

export async function getAccountingSettingByCompanyId(accountBookId: number) {
  let accountingSetting = null;

  try {
    accountingSetting = await prisma.accountingSetting.findFirst({
      where: { accountBookId },
      include: { shortcuts: true },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get accounting setting in getAccountingSetting failed',
      errorMessage: (error as Error).message,
    });
  }

  return accountingSetting;
}

export async function updateAccountingSettingById(
  accountBookId: number | string,
  data: IAccountingSetting
) {
  const { taxSettings, currency, shortcutList } = data;
  let accountingSetting = null;
  const nowInSecond = getTimestampNow();

  const numericAccountBookId =
    typeof accountBookId === 'string' ? parseInt(accountBookId, 10) : accountBookId;

  try {
    const existingAccountingSetting = await prisma.accountingSetting.findFirst({
      where: {
        accountBookId: numericAccountBookId,
        deletedAt: null,
      },
    });

    if (!existingAccountingSetting) {
      throw new Error(`Accounting setting not found for company ${accountBookId}`);
    }

    await prisma.accountingSetting.update({
      where: { id: existingAccountingSetting.id },
      data: {
        salesTaxTaxable: taxSettings.salesTax.taxable,
        salesTaxRate: taxSettings.salesTax.rate,
        purchaseTaxTaxable: taxSettings.purchaseTax.taxable,
        purchaseTaxRate: taxSettings.purchaseTax.rate,
        returnPeriodicity: taxSettings.returnPeriodicity,
        currency,
        updatedAt: nowInSecond,
      },
    });

    if (shortcutList) {
      await prisma.shortcut.deleteMany({
        where: { accountingSettingId: existingAccountingSetting.id },
      });
      await prisma.shortcut.createMany({
        data: shortcutList.map((shortcut) => ({
          accountingSettingId: existingAccountingSetting.id,
          actionName: shortcut.action.name,
          description: shortcut.action.description,
          fieldList: JSON.stringify(shortcut.action.fieldList),
          keyList: shortcut.keyList,
          createdAt: nowInSecond,
          updatedAt: nowInSecond,
        })),
      });
    }

    accountingSetting = await getAccountingSettingByCompanyId(numericAccountBookId);
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'update accounting setting in updateAccountingSetting failed',
      errorMessage: `${(error as Error).message} (accountBookId: ${accountBookId}, dataId: ${data.id})`,
    });
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'delete accounting setting in deleteAccountingSettingByIdForTesting failed',
      errorMessage: (error as Error).message,
    });
  }

  return accountingSetting;
}

export async function updateAccountingCurrency(companyId: number, currency: string) {
  let result = null;
  const nowInSecond = getTimestampNow();

  try {
    result = await prisma.accountingSetting.updateMany({
      where: { companyId },
      data: {
        currency,
        updatedAt: nowInSecond,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'update accounting currency in updateAccountingCurrency failed',
      errorMessage: (error as Error).message,
    });
  }

  return result;
}

export async function getAccountingCurrencyByCompanyId(companyId: number) {
  let currency = '';

  try {
    const accountingSetting = await prisma.accountingSetting.findFirst({
      where: { companyId },
      select: { currency: true },
    });
    currency = accountingSetting?.currency || '';
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get accounting currency in getAccountingCurrencyByCompanyId failed',
      errorMessage: (error as Error).message,
    });
  }

  return currency;
}
