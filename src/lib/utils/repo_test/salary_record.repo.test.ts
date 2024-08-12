import {
  getSalaryRecordById,
  generateInvoiceFromSalaryRecord,
  createSalaryRecordJournal,
  getInfoFromSalaryRecordLists,
  createVoucherFolder,
} from '@/lib/utils/repo/salary_record.repo';
import { JOURNAL_EVENT } from '@/constants/journal';
import salaryRecord from '@/seed_json/salary_record.json';
import prisma from '@/client';

describe('salaryRecord Repository Tests', () => {
  describe('getSalaryRecordById', () => {
    it('should get a salary record by id', async () => {
      const salaryIdNum = 1000;
      const companyId = 8867;
      const formatSalaryRecord = await getSalaryRecordById(salaryIdNum, companyId);
      expect(formatSalaryRecord).toBeDefined();
      if (formatSalaryRecord) {
        expect(formatSalaryRecord.id).toBe(salaryRecord[0].id);
        expect(formatSalaryRecord.employeeId).toBe(salaryRecord[0].employeeId);
        expect(typeof formatSalaryRecord.employeeName).toBe('string');
        expect(typeof formatSalaryRecord.employeeDepartment).toBe('string');
        expect(formatSalaryRecord.salary).toBe(salaryRecord[0].salary);
        expect(formatSalaryRecord.insurancePayment).toBe(salaryRecord[0].insurancePayment);
        expect(formatSalaryRecord.bonus).toBe(salaryRecord[0].bonus);
        expect(formatSalaryRecord.description).toBe(salaryRecord[0].description);
        expect(formatSalaryRecord.startDate).toBe(salaryRecord[0].startDate);
        expect(formatSalaryRecord.endDate).toBe(salaryRecord[0].endDate);
        expect(formatSalaryRecord.workingHour).toBe(salaryRecord[0].workingHour);
        expect(formatSalaryRecord.confirmed).toBe(salaryRecord[0].confirmed);
        expect(formatSalaryRecord.createdAt).toBe(salaryRecord[0].createdAt);
        expect(formatSalaryRecord.updatedAt).toBe(salaryRecord[0].updatedAt);
        expect(formatSalaryRecord.projects).toBeDefined();
        expect(Array.isArray(formatSalaryRecord.projects)).toBe(true);
        expect(formatSalaryRecord.projects.length).toBeGreaterThan(0);
      }
    });
  });
  describe('generateInvoiceFromSalaryRecord', () => {
    it('should generate an invoice from salary records', async () => {
      const salaryIdNum = [1000];
      const companyId = 1000;
      const formatSalaryRecord = await generateInvoiceFromSalaryRecord(companyId, salaryIdNum);
      expect(formatSalaryRecord).toBeDefined();
      if (formatSalaryRecord) {
        expect(formatSalaryRecord.deductible).toBe(true);
        expect(formatSalaryRecord.eventType).toBe('payment');
        expect(formatSalaryRecord.paymentReason).toBe('Salary Payment');
        expect(formatSalaryRecord.description).toBe(salaryRecord[0].description);
        expect(formatSalaryRecord.payment).toBeDefined();
      }
    });
  });
  describe('createSalaryRecordJournal', () => {
    it('should create a salary record journal', async () => {
      const companyId = 8867;
      const event = JOURNAL_EVENT.UPLOADED;
      const salaryRecordId = await createSalaryRecordJournal(companyId, event);
      expect(salaryRecordId).toBeDefined();
      if (salaryRecordId) {
        expect(typeof salaryRecordId).toBe('number');
      }
      await prisma.journal.delete({
        where: {
          id: salaryRecordId,
        },
      });
    });
  });
  describe('getInfoFromSalaryRecordLists', () => {
    it('should get info from salary records', async () => {
      const salaryRecordsLists = [1000];
      const voucherType = 'Salary';
      const salaryRecordInfo = await getInfoFromSalaryRecordLists(salaryRecordsLists, voucherType);
      expect(salaryRecordInfo).toBeDefined();
      if (salaryRecordInfo) {
        expect(salaryRecordInfo.description).toBe(salaryRecord[0].description);
        expect(salaryRecordInfo.amount).toBe(
          salaryRecord[0].salary + salaryRecord[0].insurancePayment
        );
      }
    });
  });
  describe('createVoucherFolder', () => {
    it('should create a voucher folder', async () => {
      const voucherType = 'Salary';
      const newVoucherNo = '20290809001';
      const companyId = 8867;
      const voucherFolder = await createVoucherFolder(voucherType, newVoucherNo, companyId);
      expect(voucherFolder).toBeDefined();
      if (voucherFolder) {
        expect(voucherFolder.name).toBe('Salary Voucher: 20290809001');
      }
      await prisma.voucherSalaryRecordFolder.delete({
        where: {
          id: voucherFolder.id,
        },
      });
    });
  });
});
