import { IAccountingSetting } from '@/interfaces/accounting_setting';
import {
  createAccountingSetting,
  deleteAccountingSettingByIdForTesting,
  getAccountingSettingByCompanyId,
  updateAccountingSettingById,
} from '@/lib/utils/repo/accounting_setting.repo';
import accountingSettings from '@/seed_json/accounting_setting.json';
import { formatAccountingSetting } from '@/lib/utils/formatter/accounting_setting.formatter';

describe('Accounting Setting Repository', () => {
  describe('createAccountingSetting', () => {
    it('should create a new accounting setting', async () => {
      const testCompanyId = 1000;
      const accountingSetting = await createAccountingSetting(testCompanyId);
      await deleteAccountingSettingByIdForTesting(accountingSetting!.id);
      expect(accountingSetting).toBeDefined();
      expect(accountingSetting!.companyId).toBe(testCompanyId);
      expect(accountingSetting!.salesTaxTaxable).toBe(true);
      expect(accountingSetting!.salesTaxRate).toBe(0.05);
      expect(accountingSetting!.purchaseTaxTaxable).toBe(true);
      expect(accountingSetting!.purchaseTaxRate).toBe(0.05);
      expect(accountingSetting!.returnPeriodicity).toBe('monthly');
      expect(accountingSetting!.currency).toBe('TWD');
    });
  });

  describe('getAccountingSettingByCompanyId', () => {
    it('should return an accounting setting by company ID', async () => {
      const companyId = 1001;
      const accountingSetting = await getAccountingSettingByCompanyId(companyId);
      expect(accountingSetting).toBeDefined();
      expect(accountingSetting?.companyId).toBe(accountingSettings[0].companyId);
      expect(accountingSetting?.salesTaxTaxable).toBe(accountingSettings[0].salesTaxTaxable);
      expect(accountingSetting?.salesTaxRate).toBe(accountingSettings[0].salesTaxRate);
      expect(accountingSetting?.purchaseTaxTaxable).toBe(accountingSettings[0].purchaseTaxTaxable);
      expect(accountingSetting?.purchaseTaxRate).toBe(accountingSettings[0].purchaseTaxRate);
      expect(accountingSetting?.returnPeriodicity).toBe(accountingSettings[0].returnPeriodicity);
    });
  });

  describe('updateAccountingSettingById', () => {
    it('should update an accounting setting by ID', async () => {
      const id = 1001;
      const companyId = 1001;
      const data: IAccountingSetting = {
        taxSettings: {
          salesTax: { taxable: false, rate: 0.07 },
          purchaseTax: { taxable: false, rate: 0.07 },
          returnPeriodicity: 'quarterly',
        },
        currency: 'EUR',
        shortcutList: [
          {
            action: { name: 'Test Action', description: 'Test Description', fieldList: [] },
            keyList: ['Ctrl', 'S'],
          },
        ],
        id: 1001,
        companyId,
      };
      const getAccountingSetting = await getAccountingSettingByCompanyId(companyId);
      const formattedAccountingSetting = formatAccountingSetting(getAccountingSetting!);
      const accountingSetting = await updateAccountingSettingById(id, data);
      await updateAccountingSettingById(id, formattedAccountingSetting);
      expect(accountingSetting).toBeDefined();
      expect(accountingSetting!.salesTaxTaxable).toBe(false);
      expect(accountingSetting!.salesTaxRate).toBe(0.07);
      expect(accountingSetting!.purchaseTaxTaxable).toBe(false);
      expect(accountingSetting!.purchaseTaxRate).toBe(0.07);
      expect(accountingSetting!.returnPeriodicity).toBe('quarterly');
      expect(accountingSetting!.currency).toBe('EUR');
      expect(accountingSetting!.shortcuts).toBeDefined();
      expect(accountingSetting!.shortcuts.length).toBe(1);
      expect(accountingSetting!.shortcuts[0].actionName).toBe('Test Action');
    });
  });
});
