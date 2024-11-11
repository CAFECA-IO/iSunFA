import { listLedger } from '@/lib/utils/repo/ledger.repo';
import { SortOrder } from '@/constants/sort';

describe('Ledger Repository', () => {
  describe('listLedger', () => {
    it('should return a paginated list of ledger items', async () => {
      const params = {
        companyId: 1002, // Info: (20241105 - Shirley) 假設存在的公司 ID
        startDate: 1706745600, // 2024-02-01
        endDate: 1707350399, // 2024-02-07 23:59:59
        startAccountNo: '1141',
        endAccountNo: '1142',
        labelType: 'general' as const,
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

        // 檢查每個分類帳項目的結構
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
          expect(item.createAt).toBeGreaterThan(0);
          expect(item.updateAt).toBeGreaterThan(0);
        });

        expect(total).toBeDefined();
        expect(total.totalDebitAmount).toBeGreaterThanOrEqual(0);
        expect(total.totalCreditAmount).toBeGreaterThanOrEqual(0);
        expect(total.createAt).toBeGreaterThan(0);
        expect(total.updateAt).toBeGreaterThan(0);
      }
    });

    it('should handle page number less than 1 and return null', async () => {
      const params = {
        companyId: 1002,
        startDate: 1706745600,
        endDate: 1707350399,
        startAccountNo: '1141',
        endAccountNo: '1142',
        labelType: 'general' as const,
        page: 0, // 無效的頁數
        pageSize: 10,
      };

      const result = await listLedger(params);
      expect(result).toBeNull();
    });

    it('should return all items when pageSize is infinity', async () => {
      const params = {
        companyId: 1002,
        startDate: 1706745600,
        endDate: 1707350399,
        startAccountNo: '1141',
        endAccountNo: '1142',
        labelType: 'general' as const,
        page: 1,
        pageSize: 'infinity' as const,
      };

      const ledger = await listLedger(params);

      expect(ledger).toBeDefined();
      expect(ledger).not.toBeNull();

      if (ledger) {
        expect(ledger.items.data.length).toBe(ledger.items.totalCount);
        expect(ledger.items.pageSize).toBe(ledger.items.totalCount);
        expect(ledger.items.hasNextPage).toBe(false);
        expect(ledger.items.hasPreviousPage).toBe(false);
      }
    });

    it('should handle empty account range', async () => {
      const params = {
        companyId: 1002,
        startDate: 1706745600,
        endDate: 1707350399,
        page: 1,
        pageSize: 10,
      };

      const ledger = await listLedger(params);
      expect(ledger).toBeDefined();
      expect(ledger).not.toBeNull();
    });
  });
});
