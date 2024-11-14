import { listTrialBalance } from '@/lib/utils/repo/trial_balance.repo';
import { SortBy, SortOrder } from '@/constants/sort';

describe('Trial Balance Repository', () => {
  describe('listTrialBalance', () => {
    it('should return a paginated list of trial balance items', async () => {
      const params = {
        companyId: 10000003,
        startDate: 1729380068,
        endDate: 1730762468,
        sortOption: `${SortBy.BEGINNING_CREDIT_AMOUNT}:${SortOrder.ASC}`,
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
        expect(items.totalPages).toBeGreaterThanOrEqual(1);
        expect(items.totalCount).toBeGreaterThanOrEqual(0);
        expect(items.pageSize).toBe(params.pageSize);
        expect(typeof items.hasNextPage).toBe('boolean');
        expect(typeof items.hasPreviousPage).toBe('boolean');

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
        companyId: 1002,
        startDate: 1609459200,
        endDate: 1640995200,
        sortOption: `${SortBy.BEGINNING_CREDIT_AMOUNT}:${SortOrder.DESC}`,
        page: 0,
        pageSize: 10,
      };

      const result = await listTrialBalance(params);
      expect(result).toBeNull();
    });

    it('should return trial balance items sorted by multiple sorting criteria', async () => {
      const params = {
        companyId: 1002,
        startDate: 1729380068,
        endDate: 1730762468,
        sortOption: `${SortBy.ENDING_DEBIT_AMOUNT}:${SortOrder.ASC}-${SortBy.BEGINNING_CREDIT_AMOUNT}:${SortOrder.DESC}`,
        page: 1,
        pageSize: 10,
      };

      const trialBalance = await listTrialBalance(params);

      expect(trialBalance).toBeDefined();
      expect(trialBalance).not.toBeNull();

      if (trialBalance) {
        const { items } = trialBalance;
        const expectedSort = [
          { sortBy: SortBy.ENDING_DEBIT_AMOUNT, sortOrder: SortOrder.ASC },
          { sortBy: SortBy.BEGINNING_CREDIT_AMOUNT, sortOrder: SortOrder.DESC },
        ];
        expect(items.sort).toEqual(expectedSort);
      }
    });

    it('should handle invalid sortOption and return default sorting', async () => {
      const params = {
        companyId: 1002,
        startDate: 1609459200,
        endDate: 1640995200,
        sortOption: 'invalid_sort_option',
        page: 1,
        pageSize: 10,
      };

      const trialBalance = await listTrialBalance(params);
      expect(trialBalance).toBeDefined();
      expect(trialBalance).not.toBeNull();

      if (trialBalance) {
        const { items } = trialBalance;
        const defaultSort = [{ sortBy: SortBy.BEGINNING_CREDIT_AMOUNT, sortOrder: SortOrder.DESC }];
        expect(items.sort).toEqual(defaultSort);
      }
    });

    it('should handle pageSize of 0 and return all items', async () => {
      const params = {
        companyId: 1002,
        startDate: 1729380068,
        endDate: 1730762468,
        sortOption: `${SortBy.BEGINNING_CREDIT_AMOUNT}:${SortOrder.DESC}`,
        page: 1,
        pageSize: 0,
      };

      const trialBalance = await listTrialBalance(params);

      expect(trialBalance).toBeDefined();
      expect(trialBalance).not.toBeNull();

      if (trialBalance) {
        const { items } = trialBalance;
        expect(items.pageSize).toBe(items.totalCount);
        expect(items.hasNextPage).toBe(false);
        expect(items.hasPreviousPage).toBe(false);
      }
    });
  });
});
