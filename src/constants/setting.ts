import { LocaleKey } from '@/constants/normal_setting';

export const DEFAULT_ACCOUNTING_SETTING = {
  SALES_TAX_TAXABLE: true,
  SALES_TAX_RATE: 0.05,
  PURCHASE_TAX_TAXABLE: true,
  PURCHASE_TAX_RATE: 0.05,
  RETURN_PERIODICITY: 'monthly',
  CURRENCY: 'TWD',
};

export const DEFAULT_USER_SETTING = {
  LANGUAGE: LocaleKey.tw,
  SYSTEM_NOTIFICATION: true,
  UPDATE_AND_SUBSCRIPTION_NOTIFICATION: true,
  EMAIL_NOTIFICATION: true,
};
