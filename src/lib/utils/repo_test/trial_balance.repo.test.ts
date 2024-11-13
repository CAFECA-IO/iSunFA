/* eslint-disable */
// FIXME: 移除disable
import { listTrialBalance } from '@/lib/utils/repo/trial_balance.repo';
import { SortBy, SortOrder } from '@/constants/sort';
import fs from 'fs';
import path from 'path';

describe('Trial Balance Repository', () => {
  describe('listTrialBalance', () => {
    it('應該返回分頁的試算表項目清單', async () => {
      // const OPTION: {
      //   [key: string]: {
      //     by: SortBy;
      //     order: SortOrder;
      //   };
      // } = {
      //   [SortBy.BEGINNING_CREDIT_AMOUNT]: {
      //     by: SortBy.BEGINNING_CREDIT_AMOUNT,
      //     order: SortOrder.DESC,
      //   },
      // };

      const params = {
        companyId: 10000003, // 假設存在的公司 ID
        startDate: 1729380068,
        endDate: 1730762468,
        sortOptions: `${SortBy.BEGINNING_CREDIT_AMOUNT}:${SortOrder.ASC}`,
        // sortOptions: Object.values(OPTION)
        //   .map((option) => `${option.by}:${option.order}`)
        //   .join('-'),

        // JSON.stringify([
        //   { sortBy: SortBy.BEGINNING_CREDIT_AMOUNT, sortOrder: SortOrder.DESC },
        // ]),

        /*
Object.values(selectedSortOptions)
            .map((option) => `${option.by}:${option.order}`)
            .join('-'),
        */
        page: 1,
        pageSize: 10,
      };

      const trialBalance = await listTrialBalance(params);
      // eslint-disable-next-line no-console
      // console.log('trialBalance in repoTest', trialBalance);
      //       console.log('trialBalance in repoTest', JSON.stringify(trialBalance));
      const DIR_NAME = 'tmp';
      const NEW_FILE_NAME = 'trialBalance-1.json';
      const logDir = path.join(process.cwd(), DIR_NAME);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logPath = path.join(logDir, NEW_FILE_NAME);
      fs.writeFileSync(logPath, JSON.stringify(trialBalance, null, 2), 'utf-8');

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

        // if (params.sortOptions) {
        //   const expectedSort = JSON.parse(params.sortOptions);
        //   expect(items.sort).toEqual(expectedSort);
        // }

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

    // it('應該處理頁數小於 1 並返回 null', async () => {
    //   const params = {
    //     companyId: 1002, // 假設存在的公司 ID
    //     startDate: 1609459200,
    //     endDate: 1640995200,
    //     sortOptions: JSON.stringify([
    //       { sortBy: SortBy.BEGINNING_CREDIT_AMOUNT, sortOrder: SortOrder.DESC },
    //     ]),
    //     page: 0, // 無效的頁數
    //     pageSize: 10,
    //   };

    //   const result = await listTrialBalance(params);
    //   expect(result).toBeNull();
    // });

    // it('應該返回根據多個排序條件排序的試算表項目', async () => {
    //   const params = {
    //     companyId: 1002,
    //     startDate: 1729380068,
    //     endDate: 1730762468,
    //     sortOptions: JSON.stringify([
    //       { sortBy: SortBy.ENDING_DEBIT_AMOUNT, sortOrder: SortOrder.ASC },
    //       { sortBy: SortBy.BEGINNING_CREDIT_AMOUNT, sortOrder: SortOrder.DESC },
    //     ]),
    //     page: 1,
    //     pageSize: 10,
    //   };

    //   const trialBalance = await listTrialBalance(params);

    //   expect(trialBalance).toBeDefined();
    //   expect(trialBalance).not.toBeNull();

    //   if (trialBalance) {
    //     const { items } = trialBalance;
    //     const expectedSort = JSON.parse(params.sortOptions);
    //     expect(items.sort).toEqual(expectedSort);
    //   }
    // });

    // it('應該處理無效的 sortOptions 並拋出錯誤', async () => {
    //   const params = {
    //     companyId: 1002,
    //     startDate: 1609459200,
    //     endDate: 1640995200,
    //     sortOptions: 'invalid_sort_option', // 無效的 sortOptions
    //     page: 1,
    //     pageSize: 10,
    //   };

    //   const trialBalance = await listTrialBalance(params);
    //   expect(trialBalance).toBeNull();
    // });

    // it('應該處理 pageSize 為 "infinity" 並返回所有項目', async () => {
    //   const params = {
    //     companyId: 1002,
    //     startDate: 1729380068,
    //     endDate: 1730762468,
    //     sortOptions: JSON.stringify([
    //       { sortBy: SortBy.BEGINNING_CREDIT_AMOUNT, sortOrder: SortOrder.DESC },
    //     ]),
    //     page: 1,
    //     pageSize: 'infinity',
    //   };

    //   const trialBalance = await listTrialBalance(params);

    //   expect(trialBalance).toBeDefined();
    //   expect(trialBalance).not.toBeNull();

    //   if (trialBalance) {
    //     const { items } = trialBalance;
    //     expect(items.pageSize).toBe(items.totalCount);
    //     expect(items.hasNextPage).toBe(false);
    //     expect(items.hasPreviousPage).toBe(false);
    //   }
    // });
  });
});
