import { ROLE_NAME, RoleName } from '@/constants/role_name';
import {
  listAdminByCompanyId,
  getAdminById,
  getAdminByCompanyIdAndUserId,
  getAdminByCompanyIdAndUserIdAndRoleName,
  createAdmin,
  updateAdminById,
  listCompanyAndRole,
  createCompanyAndRole,
  getCompanyDetailAndRoleByCompanyId,
  deleteAdminByIdForTesting,
  deleteAdminListByCompanyIdForTesting,
} from '@/lib/utils/repo/admin.repo';
import admins from '@/seed_json/admin.json';
import { deleteCompanyByIdForTesting } from '@/lib/utils/repo/company.repo';
import { FileFolder } from '@/constants/file';
import { createFile, deleteFileByIdForTesting } from '@/lib/utils/repo/file.repo';

describe('Admin Repository Tests', () => {
  const testAdminId = 1000;
  const testCompanyId = 1000;
  const testUserId = 1000;
  const testRoleId = 1000;
  const roleName = ROLE_NAME.TEST;

  describe('listAdminByCompanyId', () => {
    it('should return a list of admins for a given company ID', async () => {
      const adminList = await listAdminByCompanyId(testCompanyId);
      expect(adminList).toBeDefined();
      expect(adminList.length).toBeGreaterThan(0);
      expect(adminList[0].companyId).toEqual(admins[0].companyId);
      expect(adminList[0].userId).toEqual(admins[0].userId);
      expect(adminList[0].role.id).toEqual(admins[0].roleId);
      expect(adminList[0].status).toEqual(admins[0].status);
      expect(typeof adminList[0].startDate).toBe('number');
    });
  });

  describe('getAdminById', () => {
    it('should return an admin by its ID', async () => {
      const admin = await getAdminById(testAdminId);
      expect(admin).toBeDefined();
      expect(admin!.companyId).toEqual(admins[0].companyId);
      expect(admin!.userId).toEqual(admins[0].userId);
      expect(admin!.roleId).toEqual(admins[0].roleId);
      expect(admin!.status).toEqual(admins[0].status);
      expect(admin!.startDate).toEqual(admins[0].startDate);
    });

    it('should throw an error if the admin is not found', async () => {
      const nonExistentAdminId = -1;
      const admin = await getAdminById(nonExistentAdminId);
      expect(admin).toBeNull();
    });
  });

  describe('getAdminByCompanyIdAndUserId', () => {
    it('should return an admin by company ID and user ID', async () => {
      const admin = await getAdminByCompanyIdAndUserId(testCompanyId, testUserId);
      expect(admin).toBeDefined();
      expect(admin?.companyId).toBe(testCompanyId);
      expect(admin?.userId).toBe(testUserId);
    });

    it('should return null if the admin is not found', async () => {
      const admin = await getAdminByCompanyIdAndUserId(-1, -1);
      expect(admin).toBeNull();
    });
  });

  describe('getAdminByCompanyIdAndUserIdAndRoleName', () => {
    it('should return an admin by company ID, user ID, and role name', async () => {
      const admin = await getAdminByCompanyIdAndUserIdAndRoleName(
        testCompanyId,
        testUserId,
        roleName
      );
      expect(admin).toBeDefined();
      expect(admin!.companyId).toBe(testCompanyId);
      expect(admin!.userId).toBe(testUserId);
      expect(admin!.role.name).toBe(roleName);
    });

    it('should throw an error if the admin is not found', async () => {
      const admin = await getAdminByCompanyIdAndUserIdAndRoleName(
        9999,
        9998,
        'NON_EXISTENT_ROLE' as RoleName
      );
      expect(admin).toBeNull();
    });
  });

  describe('createAdmin', () => {
    it('should create a new admin', async () => {
      const admin = await createAdmin(testUserId, testCompanyId, testRoleId);
      await deleteAdminByIdForTesting(admin.id); // Clean up after test
      expect(admin).toBeDefined();
      expect(admin.userId).toBe(testUserId);
      expect(admin.companyId).toBe(testCompanyId);
      expect(admin.roleId).toBe(testRoleId);
    });
  });

  describe('updateAdminById', () => {
    it("should update an admin's details", async () => {
      const status = false;
      const admin = await updateAdminById(testAdminId, status);
      await updateAdminById(testAdminId, admins[0].status, testRoleId); // Info: (20240704 - Jacky) Reset
      expect(admin).toBeDefined();
      expect(admin.id).toBe(testAdminId);
      expect(admin.status).toBe(status);
      expect(admin.role.name).toBe(roleName);
    });
  });

  describe('listCompanyAndRole', () => {
    it('should list companies and roles for a given user ID', async () => {
      const list = await listCompanyAndRole(testUserId);
      expect(list).toBeDefined();
      expect(list.data.length).toBeGreaterThan(0);
      expect(list.data[0].company.id).toEqual(admins[0].companyId);
      expect(list.data[0].role.id).toEqual(admins[0].roleId);
    });
  });

  describe('getCompanyDetailAndRoleByCompanyId', () => {
    it('should return company details and role by company ID', async () => {
      const detail = await getCompanyDetailAndRoleByCompanyId(testUserId, testCompanyId);
      expect(detail).toBeDefined();
      expect(detail?.company.id).toBe(testCompanyId);
      expect(detail?.role).toBeDefined();
    });

    it('should return null if the company details and role are not found', async () => {
      const detail = await getCompanyDetailAndRoleByCompanyId(testUserId, -1);
      expect(detail).toBeNull();
    });
  });

  describe('createCompanyAndRole', () => {
    it('should create a company and role for a given user', async () => {
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
      expect(companyRole.company.taxId).toBe(taxId);
      expect(companyRole.company.name).toBe(name);
      expect(companyRole.role.name).toBe(ROLE_NAME.OWNER);
    });
  });
});
