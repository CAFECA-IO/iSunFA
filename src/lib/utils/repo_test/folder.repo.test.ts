import { getFolderList, getFolderContent } from '@/lib/utils/repo/folder.repo';
import voucherSalaryRecordFolder from '@/seed_json/voucher_salary_record_folder.json';

describe('Folder Repository Tests', () => {
  describe('getFolderList', () => {
    it('should return a list of folders for a valid company id', async () => {
      const companyId = 8867;
      const result = await getFolderList(companyId);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe(voucherSalaryRecordFolder[0].id);
      expect(result[0].name).toBe(voucherSalaryRecordFolder[0].name);
      expect(result[0].createdAt).toBe(voucherSalaryRecordFolder[0].createdAt);
    });
    it('should return an empty list for an invalid company id', async () => {
      const companyId = -1;
      const result = await getFolderList(companyId);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
  describe('getFolderContent', () => {
    it('should return related info for a valid folder id', async () => {
      const companyId = 8867;
      const folderId = 10000000;
      const result = await getFolderContent(companyId, folderId);
      expect(result).toBeDefined();
      if (result) {
        expect(result.id).toBe(voucherSalaryRecordFolder[0].id);
        expect(result.name).toBe(voucherSalaryRecordFolder[0].name);
        expect(result.createdAt).toBe(voucherSalaryRecordFolder[0].createdAt);
        expect(result.voucher).toBeDefined();
        expect(result.salaryRecordList).toBeDefined();
        expect(Array.isArray(result.salaryRecordList)).toBe(true);
        expect(result.salaryRecordList.length).toBeGreaterThan(0);
      }
    });
    it('should return null for an invalid folder id', async () => {
      const companyId = 8867;
      const folderId = -1;
      const result = await getFolderContent(companyId, folderId);
      expect(result).toBeNull();
    });
  });
});
