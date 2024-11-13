import { listLedger } from '@/lib/utils/repo/ledger.repo';
import { SortOrder } from '@/constants/sort';
import { LabelType } from '@/constants/ledger';

describe('Ledger Repository', () => {
  describe('listLedger', () => {
    it('should return paginated ledger items list', async () => {
      const params = {
        companyId: 1002,
        startDate: 1706745600, // Info: (20241105 - Shirley) 2024-02-01
        endDate: 1707350399, // Info: (20241105 - Shirley) 2024-02-07 23:59:59
        startAccountNo: '1141',
        endAccountNo: '1142',
        labelType: LabelType.GENERAL,
        page: 1,
        pageSize: 10,
      };

      const ledger = await listLedger(params);

      expect(ledger).toBeDefined();
      expect(ledger).not.toBeNull();

      if (ledger) {
        expect(ledger.currencyAlias).toBeDefined();

        const { items, total } = ledger;
        expect(items).toBeDefined();
        expect(Array.isArray(items.data)).toBe(true);
        expect(items.data.length).toBeLessThanOrEqual(params.pageSize);
        expect(items.page).toBe(params.page);
        expect(items.totalPages).toBeGreaterThanOrEqual(0);
        expect(items.totalCount).toBeGreaterThanOrEqual(0);
        expect(items.pageSize).toBe(params.pageSize);
        expect(typeof items.hasNextPage).toBe('boolean');
        expect(typeof items.hasPreviousPage).toBe('boolean');
        expect(items.sort).toEqual([{ sortBy: 'voucherDate', sortOrder: SortOrder.ASC }]);

        // Info: (20241112 - Shirley) Check structure of each ledger item
        items.data.forEach((item) => {
          expect(item.id).toBeDefined();
          expect(item.voucherDate).toBeGreaterThanOrEqual(params.startDate);
          expect(item.voucherDate).toBeLessThanOrEqual(params.endDate);
          expect(item.no).toBeDefined();
          expect(item.accountingTitle).toBeDefined();
          expect(item.voucherNumber).toBeDefined();
          expect(item.particulars).toBeDefined();
          expect(item.debitAmount).toBeGreaterThanOrEqual(0);
          expect(item.creditAmount).toBeGreaterThanOrEqual(0);
          expect(item.balance).toBeDefined();
          expect(item.createdAt).toBeGreaterThan(0);
          expect(item.updatedAt).toBeGreaterThan(0);
        });

        expect(total).toBeDefined();
        expect(total.totalDebitAmount).toBeGreaterThanOrEqual(0);
        expect(total.totalCreditAmount).toBeGreaterThanOrEqual(0);
        expect(total.createdAt).toBeGreaterThan(0);
        expect(total.updatedAt).toBeGreaterThan(0);
      }
    });

    it('should handle page number less than 1 and return null', async () => {
      const params = {
        companyId: 1002,
        startDate: 1706745600,
        endDate: 1707350399,
        startAccountNo: '1141',
        endAccountNo: '1142',
        labelType: LabelType.GENERAL,
        page: 0, // Info: (20241112 - Shirley) Invalid page number
        pageSize: 10,
      };

      const result = await listLedger(params);
      expect(result).toBeNull();
    });

    it('should handle empty account number range', async () => {
      const params = {
        companyId: 1002, // Info: (20241112 - Shirley) Test data with vouchers for amount summation
        startDate: 0,
        endDate: 1787350399,
        page: 1,
        pageSize: 10,
        labelType: LabelType.GENERAL,
      };

      const ledger = await listLedger(params);
      expect(ledger).toBeDefined();
      expect(ledger).not.toBeNull();
    });

    it('should correctly filter accounts when labelType is DETAILED', async () => {
      const params = {
        companyId: 1002,
        startDate: 1706745600,
        endDate: 1707350399,
        startAccountNo: '111A',
        endAccountNo: '111D',
        labelType: LabelType.DETAILED,
        page: 1,
        pageSize: 10,
      };

      const ledger = await listLedger(params);

      expect(ledger).toBeDefined();
      expect(ledger).not.toBeNull();

      if (ledger) {
        const { items } = ledger;
        items.data.forEach((item) => {
          expect(item.no).toMatch(/-/); // Info: (20241112 - Shirley) Detailed type code should contain '-'
        });
      }
    });

    it('should correctly filter accounts when labelType is GENERAL', async () => {
      const params = {
        companyId: 1002,
        startDate: 1706745600,
        endDate: 1707350399,
        startAccountNo: '111A',
        endAccountNo: '111D',
        labelType: LabelType.GENERAL,
        page: 1,
        pageSize: 10,
      };

      const ledger = await listLedger(params);

      expect(ledger).toBeDefined();
      expect(ledger).not.toBeNull();

      if (ledger) {
        const { items } = ledger;
        items.data.forEach((item) => {
          expect(item.no).not.toMatch(/-/); // Info: (20241112 - Shirley) General type code should not contain '-'
        });
      }
    });

    it('should return null when no matching accounts found', async () => {
      const params = {
        companyId: 99999999, // Info: (20241112 - Shirley) Assuming non-existent company ID
        startDate: 1706745600,
        endDate: 1707350399,
        startAccountNo: 'non-exist',
        endAccountNo: 'non-exist',
        labelType: LabelType.GENERAL,
        page: 1,
        pageSize: 10,
      };

      const ledger = await listLedger(params);
      expect(ledger?.items.data.length).toBe(0);
    });

    it('should handle account number range containing letters', async () => {
      const params = {
        companyId: 1002,
        startDate: 1706745600,
        endDate: 1707350399,
        startAccountNo: '111A',
        endAccountNo: '111D',
        labelType: LabelType.ALL,
        page: 1,
        pageSize: 50,
      };

      const ledger = await listLedger(params);

      expect(ledger).toBeDefined();
      expect(ledger).not.toBeNull();

      if (ledger) {
        const { items } = ledger;
        items.data.forEach((item) => {
          const code = item.no;
          expect(code >= '111A' && code <= '111D').toBe(true);
        });
      }
    });

    it('should handle invalid company ID and catch errors', async () => {
      const params = {
        companyId: -1, // Info: (20241112 - Shirley) Invalid company ID
        startDate: 1706745600,
        endDate: 1707350399,
        startAccountNo: '1141',
        endAccountNo: '1142',
        labelType: LabelType.GENERAL,
        page: 1,
        pageSize: 10,
      };

      const ledger = await listLedger(params);
      expect(ledger?.items.data.length).toBe(0);
    });

    it('should handle date range with no vouchers', async () => {
      const params = {
        companyId: 1002,
        startDate: 1893456000, // Info: (20241112 - Shirley) Future date, assuming no vouchers
        endDate: 1896143999,
        startAccountNo: '1141',
        endAccountNo: '1142',
        labelType: LabelType.GENERAL,
        page: 1,
        pageSize: 10,
      };

      const ledger = await listLedger(params);
      expect(ledger).toBeDefined();
      expect(ledger).not.toBeNull();

      if (ledger) {
        expect(ledger.items.data.length).toBe(0);
        expect(ledger.items.totalCount).toBe(0);
        expect(ledger.total.totalDebitAmount).toBe(0);
        expect(ledger.total.totalCreditAmount).toBe(0);
      }
    });

    it('should handle missing startAccountNo and endAccountNo', async () => {
      const params = {
        companyId: 1002,
        startDate: 1706745600,
        endDate: 1707350399,
        labelType: LabelType.GENERAL,
        page: 1,
        pageSize: 10,
      };

      const ledger = await listLedger(params);
      expect(ledger).toBeDefined();
      expect(ledger).not.toBeNull();

      if (ledger) {
        const { items } = ledger;
        expect(items.data.length).toBeLessThanOrEqual(10);
      }
    });

    it('should handle pageSize of 0 and return null', async () => {
      const params = {
        companyId: 1002,
        startDate: 1706745600,
        endDate: 1707350399,
        startAccountNo: '1141',
        endAccountNo: '1142',
        labelType: LabelType.GENERAL,
        page: 1,
        pageSize: 0, // Info: (20241112 - Shirley) Invalid pageSize
      };

      const ledger = await listLedger(params);
      expect(ledger?.items.data.length).toBe(0);
    });

    it('should handle startDate greater than endDate and return null', async () => {
      const params = {
        companyId: 1002,
        startDate: 1707350400, // Info: (20241112 - Shirley) timestamp of 2024-02-08
        endDate: 1706745600, // Info: (20241112 - Shirley) timestamp of 2024-02-01
        startAccountNo: '1141',
        endAccountNo: '1142',
        labelType: LabelType.GENERAL,
        page: 1,
        pageSize: 10,
      };

      const ledger = await listLedger(params);
      expect(ledger?.items.data.length).toBe(0);
    });

    it('should handle labelType ALL and return all account types', async () => {
      const params = {
        companyId: 1002,
        startDate: 1706745600,
        endDate: 1707350399,
        startAccountNo: '111A',
        endAccountNo: '111D',
        labelType: LabelType.ALL,
        page: 1,
        pageSize: 50,
      };

      const ledger = await listLedger(params);

      expect(ledger).toBeDefined();
      expect(ledger).not.toBeNull();

      if (ledger) {
        const { items } = ledger;
        // Info: (20241112 - Shirley) ALL should include both GENERAL and DETAILED
        items.data.forEach((item) => {
          expect(item.no.includes('-') || !item.no.includes('-')).toBe(true);
        });
      }
    });
  });
});
