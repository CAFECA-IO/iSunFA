import { listTrialBalance } from '@/lib/utils/repo/trial_balance.repo';
import { SortOrder } from '@/constants/sort';
import { SortBy } from '@/constants/journal';
// import { trialBalanceItemSchema } from '@/lib/utils/zod_schema/trial_balance';
import fs from 'fs';
import path from 'path';

describe('Trial Balance Repository', () => {
  describe('listTrialBalance', () => {
    it('應該返回分頁的試算表項目列表', async () => {
      const params = {
        companyId: 10000455, // 假設存在的公司 ID
        // companyId: 1002, // 假設存在的公司 ID
        startDate: 1729380068,
        endDate: 1730762468,
        sortBy: SortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
        page: 1,
        pageSize: 10,
      };

      // // eslint-disable-next-line no-console
      // console.log('targeted data MOCK_RESPONSE.items.data[0]', MOCK_RESPONSE.items.data[0]);
      // // eslint-disable-next-line no-console
      // console.log('parse result', trialBalanceItemSchema.parse(MOCK_RESPONSE.items.data[0]));

      const trialBalance = await listTrialBalance(params);

      expect(trialBalance).toBeDefined();
      // Deprecated: (20241031 - Shirley)
      // eslint-disable-next-line no-console
      // console.log('real_data trialBalance', JSON.stringify(trialBalance, null, 2));

      // 將測試數據寫入檔案
      const logDir = path.join(process.cwd(), 'tmp');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logPath = path.join(logDir, 'trial-balance-test-1.json');
      fs.writeFileSync(logPath, JSON.stringify(trialBalance, null, 2), 'utf-8');

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
      // FIXME: implement it
      // eslint-disable-next-line
      const params = {
        companyId: 9999, // 假設不存在的公司 ID
        startDate: 1609459200,
        endDate: 1640995200,
        sortBy: SortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
        page: 1,
        pageSize: 10,
      };

      // await expect(listTrialBalance(params)).rejects.toThrow('Bad request');
    });
  });
});
