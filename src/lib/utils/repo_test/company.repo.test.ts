import { getCompanyById, updateCompanyById } from '@/lib/utils/repo/company.repo';
import companies from '@/seed_json/company.json';

describe('Company Repository Tests', () => {
  const testCompanyId = 1000;

  describe('getCompanyById', () => {
    it('should return a company by its ID', async () => {
      const company = await getCompanyById(testCompanyId);
      expect(company).toBeDefined();
      expect(company?.taxId).toEqual(companies[0].taxId);
      expect(company?.name).toEqual(companies[0].name);
      expect(company?.createdAt).toEqual(companies[0].createdAt);
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
          updatedCompany.name
        );
        await updateCompanyById(testCompanyId, companies[0].taxId, companies[0].name); // Info: (20240704 - Jacky) Rollback the changes
        expect(company).toBeDefined();
        expect(company!.taxId).toBe(updatedCompany.code);
        expect(company!.name).toBe(updatedCompany.name);
      });
    });
    it('should return null if the company is not found', async () => {
      const nonExistentCompanyId = 9999;
      const company = await getCompanyById(nonExistentCompanyId);
      expect(company).toBeNull();
    });
  });

  describe('updateCompanyById', () => {
    it("should update a company's details", async () => {
      const updatedCompany = {
        taxId: 'NEWCODE',
        name: 'New Name',
        regional: 'New Regional',
      };
      const company = await updateCompanyById(
        testCompanyId,
        updatedCompany.taxId,
        updatedCompany.name
      );
      await updateCompanyById(testCompanyId, companies[0].taxId, companies[0].name); // Info: (20240704 - Jacky) Rollback the changes
      expect(company).toBeDefined();
      expect(company!.taxId).toBe(updatedCompany.taxId);
      expect(company!.name).toBe(updatedCompany.name);
    });
  });
});
