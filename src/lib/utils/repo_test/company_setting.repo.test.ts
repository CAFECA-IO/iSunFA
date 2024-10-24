import { ICompanySetting } from '@/interfaces/company_setting';
import {
  createCompanySetting,
  deleteCompanySettingByIdForTesting,
  getCompanySettingByCompanyId,
  updateCompanySettingById,
} from '@/lib/utils/repo/company_setting.repo';
import companySettings from '@/seed_json/company_setting.json';
import { formatCompanySetting } from '@/lib/utils/formatter/company_setting.formatter';

describe('Company Setting Repository', () => {
  describe('createCompanySetting', () => {
    it('should create a new company setting', async () => {
      const testCompanyId = 1002;
      const companySetting = await createCompanySetting(testCompanyId);
      await deleteCompanySettingByIdForTesting(companySetting!.id);
      expect(companySetting).toBeDefined();
      expect(companySetting!.companyId).toBe(testCompanyId);
      expect(companySetting!.taxSerialNumber).toBe('');
      expect(companySetting!.representativeName).toBe('');
      expect(companySetting!.country).toBe('');
      expect(companySetting!.phone).toBe('');
      expect(companySetting!.address).toBe('');
    });
  });

  describe('getCompanySettingByCompanyId', () => {
    it('should return a company setting by company ID', async () => {
      const companyId = 1000;
      const companySetting = await getCompanySettingByCompanyId(companyId);
      expect(companySetting).toBeDefined();
      expect(companySetting?.companyId).toBe(companySettings[0].companyId);
      expect(companySetting?.taxSerialNumber).toBe(companySettings[0].taxSerialNumber);
      expect(companySetting?.representativeName).toBe(companySettings[0].representativeName);
      expect(companySetting?.country).toBe(companySettings[0].country);
      expect(companySetting?.phone).toBe(companySettings[0].phone);
      expect(companySetting?.address).toBe(companySettings[0].address);
    });
  });

  describe('updateCompanySettingById', () => {
    it('should update a company setting by ID', async () => {
      const id = 1001;
      const companyId = 1001;
      const data: ICompanySetting = {
        id,
        companyId,
        companyName: 'Test Company',
        companyTaxId: '123456789',
        taxSerialNumber: '123456789',
        representativeName: 'Jane Doe',
        country: 'US',
        phone: '9876543210',
        address: '123 Main St',
        createdAt: 1635244800,
        updatedAt: 1635244800,
      };
      const originalCompanySetting = await getCompanySettingByCompanyId(companyId);
      const formattedCompanySetting = formatCompanySetting(originalCompanySetting!);
      const companySetting = await updateCompanySettingById(id, data);
      await updateCompanySettingById(id, formattedCompanySetting);
      expect(companySetting).toBeDefined();
      expect(companySetting!.taxSerialNumber).toBe('123456789');
      expect(companySetting!.representativeName).toBe('Jane Doe');
      expect(companySetting!.country).toBe('US');
      expect(companySetting!.phone).toBe('9876543210');
      expect(companySetting!.address).toBe('123 Main St');
    });
  });
});
