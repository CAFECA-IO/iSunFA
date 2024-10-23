import { listTrialBalance } from '@/lib/utils/repo/trial_balance.repo';
import { SortOrder } from '@/constants/sort';
import { SortBy } from '@/constants/journal';

describe('Trial Balance Repository', () => {
  describe('listTrialBalance', () => {
    it('應該返回分頁的試算表項目列表', async () => {
      const params = {
        // companyId: 10000005, // 假設存在的公司 ID
        companyId: 1002, // 假設存在的公司 ID
        startDate: 1609459200,
        endDate: 1640995200,
        sortBy: SortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
        page: 1,
        pageSize: 10,
      };

      const trialBalance = await listTrialBalance(params);

      expect(trialBalance).toBeDefined();
      // Deprecated: (20241031 - Shirley)
      // eslint-disable-next-line no-console
      console.log('trialBalance', JSON.stringify(trialBalance, null, 2));

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
    });

    it('應該處理無效的公司 ID 並拋出錯誤', async () => {
      const params = {
        companyId: 9999, // 假設不存在的公司 ID
        startDate: 1609459200,
        endDate: 1640995200,
        sortBy: SortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
        page: 1,
        pageSize: 10,
      };

      await expect(listTrialBalance(params)).rejects.toThrow('Bad request');
    });
  });
});
