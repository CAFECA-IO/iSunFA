import { listTrialBalance } from '@/lib/utils/repo/trial_balance.repo';
import { SortOrder } from '@/constants/sort';
import { SortBy } from '@/constants/journal';

describe('Trial Balance Repository', () => {
  describe('listTrialBalance', () => {
    it('should return a paginated list of trial balance items', async () => {
      const params = {
        companyId: 1002, // Info: (20241105 - Shirley) 假設存在的公司 ID
        startDate: 1729380068,
        endDate: 1730762468,
        sortBy: SortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
        page: 1,
        pageSize: 10,
      };

      const trialBalance = await listTrialBalance(params);

      expect(trialBalance).toBeDefined();
      expect(trialBalance).not.toBeNull();

      if (trialBalance) {
        expect(trialBalance.currencyAlias).toBeDefined();

        const { items, total } = trialBalance;
        expect(items).toBeDefined();
        expect(Array.isArray(items.data)).toBe(true);
        expect(items.data.length).toBeLessThanOrEqual(params.pageSize);
        expect(items.page).toBe(params.page);
        expect(items.totalPages).toBeGreaterThanOrEqual(0);
        expect(items.totalCount).toBeGreaterThanOrEqual(0);
        expect(items.pageSize).toBe(params.pageSize);
        expect(typeof items.hasNextPage).toBe('boolean');
        expect(typeof items.hasPreviousPage).toBe('boolean');
        expect(items.sort).toEqual([{ sortBy: params.sortBy, sortOrder: params.sortOrder }]);

        expect(total).toBeDefined();
        expect(total.beginningCreditAmount).toBeGreaterThanOrEqual(0);
        expect(total.beginningDebitAmount).toBeGreaterThanOrEqual(0);
        expect(total.midtermCreditAmount).toBeGreaterThanOrEqual(0);
        expect(total.midtermDebitAmount).toBeGreaterThanOrEqual(0);
        expect(total.endingCreditAmount).toBeGreaterThanOrEqual(0);
        expect(total.endingDebitAmount).toBeGreaterThanOrEqual(0);
        expect(total.createAt).toBeGreaterThan(0);
        expect(total.updateAt).toBeGreaterThan(0);
      }
    });

    it('should handle page number less than 1 and return null', async () => {
      const params = {
        companyId: 1002, // Info: (20241105 - Shirley) 假設存在的公司 ID
        startDate: 1609459200,
        endDate: 1640995200,
        sortBy: SortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
        page: 0, // Info: (20241105 - Shirley) 無效的頁數
        pageSize: 10,
      };

      const result = await listTrialBalance(params);
      expect(result).toBeNull();
    });

    it('should return all items when pageSize is infinity', async () => {
      const params = {
        companyId: 1002, // Info: (20241105 - Shirley) 假設存在的公司 ID
        startDate: 1609459200,
        endDate: 1640995200,
        sortBy: SortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
        page: 1,
        pageSize: 'infinity' as const,
      };

      const trialBalance = await listTrialBalance(params);

      expect(trialBalance).toBeDefined();
      expect(trialBalance).not.toBeNull();

      if (trialBalance) {
        expect(trialBalance.items.data.length).toBe(trialBalance.items.totalCount);
        expect(trialBalance.items.pageSize).toBe(trialBalance.items.totalCount);
        expect(trialBalance.items.hasNextPage).toBe(false);
        expect(trialBalance.items.hasPreviousPage).toBe(false);
      }
    });
  });
});
