import { getCompanyByCode, getCompanyById, updateCompanyById } from '@/lib/utils/repo/company.repo';
import companies from '@/seed_json/company.json';

describe('Company Repository Tests', () => {
  const testCompanyId = 1000;

  describe('getCompanyById', () => {
    it('should return a company by its ID', async () => {
      const company = await getCompanyById(testCompanyId);
      expect(company).toBeDefined();
      expect(company?.code).toEqual(companies[0].code);
      expect(company?.name).toEqual(companies[0].name);
      expect(company?.regional).toEqual(companies[0].regional);
      expect(company?.createdAt).toEqual(companies[0].createdAt);
      expect(company?.kycStatus).toEqual(companies[0].kycStatus);
    });

    it('should return null if the company is not found', async () => {
      const nonExistentCompanyId = 9999;
      const company = await getCompanyById(nonExistentCompanyId);
      expect(company).toBeNull();
    });
  });

  describe('getCompanyByCode', () => {
    it('should return a company when a valid code is provided', async () => {
      const validCode = 'TEST123'; // Assuming 'VALIDCODE' exists in the database
      const company = await getCompanyByCode(validCode);
      expect(company).toBeDefined();
      expect(company?.code).toEqual(validCode);
    });

    it('should return null when an invalid code is provided', async () => {
      const invalidCode = 'INVALIDCODE';
      const company = await getCompanyByCode(invalidCode);
      expect(company).toBeNull();
    });
  });

  describe('updateCompanyById', () => {
    it("should update a company's details", async () => {
      const updatedCompany = {
        code: 'NEWCODE',
        name: 'New Name',
        regional: 'New Regional',
      };
      const company = await updateCompanyById(
        testCompanyId,
        updatedCompany.code,
        updatedCompany.name,
        updatedCompany.regional
      );
      await updateCompanyById(
        testCompanyId,
        companies[0].code,
        companies[0].name,
        companies[0].regional
      ); // Rollback the changes
      expect(company).toBeDefined();
      expect(company!.code).toBe(updatedCompany.code);
      expect(company!.name).toBe(updatedCompany.name);
      expect(company!.regional).toBe(updatedCompany.regional);
    });
  });
});
