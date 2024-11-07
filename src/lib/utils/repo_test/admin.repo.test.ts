import { CompanyRoleName } from '@/constants/role';
import {
  createAdmin,
  createCompanyAndRole,
  deleteAdminListByCompanyIdForTesting,
  deleteAdminById,
  getCompanyAndRoleByTaxId,
  getCompanyAndRoleByUserIdAndCompanyId,
  getCompanyByUserIdAndCompanyId,
  getOwnerByCompanyId,
  listCompanyByUserId,
  setCompanyToTop,
  updateCompanyTagById,
  getAdminByCompanyIdAndUserId,
} from '@/lib/utils/repo/admin.repo';
import admins from '@/seed_json/admin.json';
import { deleteCompanyByIdForTesting } from '@/lib/utils/repo/company.repo';
import { FileFolder } from '@/constants/file';
import { createFile, deleteFileByIdForTesting } from '@/lib/utils/repo/file.repo';
import { CompanyTag } from '@/constants/company';

describe('Admin Repository Additional Tests', () => {
  const testAdminId = 1000;
  const testCompanyId = 1000;
  const testUserId = 1000;
  const testRoleId = 1000;

  describe('listCompanyByUserId', () => {
    it('should return a list of companies for a given user ID', async () => {
      const companyList = await listCompanyByUserId(testUserId);
      expect(companyList).toBeDefined();
      expect(companyList.length).toBeGreaterThan(0);
      expect(companyList[0].company.id).toEqual(admins[0].companyId);
    });
  });

  describe('getCompanyByUserIdAndCompanyId', () => {
    it('should return a company by user ID and company ID', async () => {
      const company = await getCompanyByUserIdAndCompanyId(testUserId, testCompanyId);
      expect(company).toBeDefined();
      expect(company?.id).toBe(testCompanyId);
    });

    it('should return null if the company is not found', async () => {
      const company = await getCompanyByUserIdAndCompanyId(testUserId, -1);
      expect(company).toBeNull();
    });
  });

  describe('getOwnerByCompanyId', () => {
    it('should return the owner of a company by company ID', async () => {
      const owner = await getOwnerByCompanyId(testCompanyId);
      expect(owner).toBeDefined();
      expect(owner?.role.name).toBe(CompanyRoleName.OWNER);
    });

    it('should return null if the owner is not found', async () => {
      const owner = await getOwnerByCompanyId(-1);
      expect(owner).toBeNull();
    });
  });

  describe('deleteAdminById', () => {
    it('should delete an admin by its ID', async () => {
      const admin = await createAdmin(testUserId, testCompanyId, testRoleId);
      const deletedAdmin = await deleteAdminById(admin.id);
      expect(deletedAdmin).toBeDefined();
      expect(deletedAdmin.id).toBe(admin.id);
    });
  });

  describe('getCompanyAndRoleByUserIdAndCompanyId', () => {
    it('should return company and role by user ID and company ID', async () => {
      const companyRole = await getCompanyAndRoleByUserIdAndCompanyId(testUserId, testCompanyId);
      expect(companyRole).toBeDefined();
      expect(companyRole?.company.id).toBe(testCompanyId);
      expect(companyRole?.role).toBeDefined();
    });

    it('should return null if the company and role are not found', async () => {
      const companyRole = await getCompanyAndRoleByUserIdAndCompanyId(testUserId, -1);
      expect(companyRole).toBeNull();
    });
  });

  describe('getCompanyAndRoleByTaxId', () => {
    it('should return company and role by user ID and tax ID', async () => {
      const taxId = `TESTCODE-${Date.now()}`;
      const name = 'Test Company';
      const testFile = await createFile({
        name: 'test',
        size: 100,
        mimeType: 'image/png',
        type: FileFolder.TMP,
        url: 'https://test.com',
        isEncrypted: false,
        encryptedSymmetricKey: '',
      });
      if (!testFile) {
        throw new Error('Failed to create a test file');
      }
      const companyRole = await createCompanyAndRole(testUserId, taxId, name, testFile.id);
      await deleteAdminListByCompanyIdForTesting(companyRole.company.id);
      await deleteCompanyByIdForTesting(companyRole.company.id);
      await deleteFileByIdForTesting(testFile.id); // Clean up after test
      expect(companyRole).toBeDefined();
      expect(companyRole?.company.taxId).toBe(taxId);
      expect(companyRole?.role.name).toBe(CompanyRoleName.OWNER);
    });

    it('should return null if the company and role are not found', async () => {
      const companyRole = await getCompanyAndRoleByTaxId(testUserId, 'NON_EXISTENT_TAX_ID');
      expect(companyRole).toBeNull();
    });
  });

  describe('setCompanyToTop', () => {
    it('should set the company to the top for a given user ID and company ID', async () => {
      const companyRole = await setCompanyToTop(testUserId, testCompanyId);
      expect(companyRole).toBeDefined();
      expect(companyRole?.company.id).toBe(testCompanyId);
    });
  });

  describe('updateCompanyTagById', () => {
    it('should update the company tag by admin ID', async () => {
      const newTag = CompanyTag.ALL;
      const updatedCompany = await updateCompanyTagById(testAdminId, newTag);
      expect(updatedCompany).toBeDefined();
      expect(updatedCompany.tag).toBe(newTag);
    });
  });
  describe('getAdminByCompanyIdAndUserId', () => {
    it('should return an admin by company ID and user ID', async () => {
      const admin = await getAdminByCompanyIdAndUserId(testCompanyId, testUserId);
      expect(admin).toBeDefined();
      expect(admin?.company.id).toBe(testCompanyId);
      expect(admin?.user.id).toBe(testUserId);
    });

    it('should return null if the admin is not found', async () => {
      const admin = await getAdminByCompanyIdAndUserId(-1, testUserId);
      expect(admin).toBeNull();
    });

    it('should return null if the user ID is invalid', async () => {
      const admin = await getAdminByCompanyIdAndUserId(testCompanyId, -1);
      expect(admin).toBeNull();
    });
  });
});
