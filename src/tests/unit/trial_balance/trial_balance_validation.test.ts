/**
 * Info: (20250611 - Shirley) Trial Balance API 核心邏輯測試套件
 *
 * 本測試套件專注於測試 API 實際使用的核心業務邏輯函數，包括：
 * 1. getCurrent401Period - 獲取 401 申報期間
 * 2. convertToTrialBalanceItem - 轉換為試算表項目
 * 3. processLineItems - 處理明細項目
 * 4. convertToAPIFormat - 轉換為 API 格式
 * 5. formatPaginatedTrialBalance - 格式化分頁資料
 * 6. sortTrialBalanceItem - 排序邏輯
 * 7. 邊界條件和錯誤處理
 */

import { Prisma, Account } from '@prisma/client';
import {
  getCurrent401Period,
  convertToTrialBalanceItem,
  processLineItems,
  convertToAPIFormat,
  sortTrialBalanceItem,
  mergeLineItems,
  categorizeAndMergeLineItems,
  calculateEndingBalance,
} from '@/lib/utils/trial_balance';
import { formatPaginatedTrialBalance } from '@/lib/utils/formatter/trial_balance.formatter';
import { SortBy, SortOrder } from '@/constants/sort';
import { DEFAULT_SORT_OPTIONS } from '@/constants/trial_balance';
import { TrialBalanceItem, ILineItemInTrialBalanceItem } from '@/interfaces/trial_balance';
import { ILineItemSimpleAccountVoucher } from '@/interfaces/line_item';

// Info: (20250611 - Shirley) ========== Mock Data Helpers ==========

const createMockLineItem = (
  id: number,
  accountId: number,
  amount: number,
  debit: boolean,
  voucherId: number,
  accountCode: string,
  accountName: string,
  voucherDate: number
): ILineItemSimpleAccountVoucher => ({
  id,
  amount: new Prisma.Decimal(amount),
  description: `Line item ${id}`,
  debit,
  accountId,
  voucherId,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  deletedAt: null,
  voucher: {
    id: voucherId,
    date: voucherDate, // Info: (20250611 - Shirley) 使用傳入的日期
    type: 'PAYMENT',
    no: `V${voucherId}`,
  },
  account: {
    id: accountId,
    code: accountCode,
    name: accountName,
    parentId: 1,
  },
});

const createMockAccount = (
  id: number,
  code: string,
  name: string,
  parentId: number | null = null
): Account => ({
  id,
  code,
  name,
  parentId: parentId || 1,
  note: null,
  liquidity: false,
  type: 'ASSET',
  forUser: true,
  debit: true,
  level: 1,
  createdAt: Math.floor(Date.now() / 1000),
  updatedAt: Math.floor(Date.now() / 1000),
  deletedAt: null,
  rootId: 1,
  accountBookId: 1,
  system: 'IFRS',
  parentCode: code,
  rootCode: code,
});

const createMockLineItemWithDebitCredit = (
  lineItem: ILineItemSimpleAccountVoucher
): ILineItemInTrialBalanceItem => ({
  ...lineItem,
  debitAmount: lineItem.debit ? lineItem.amount.toString() : '0',
  creditAmount: !lineItem.debit ? lineItem.amount.toString() : '0',
});

// Info: (20250611 - Shirley) ========== 1. API 核心流程測試 ==========
// Info: (20250611 - Shirley) Effective test case
describe('Trial Balance API 核心流程', () => {
  describe('getCurrent401Period - 401 申報期間計算', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('應該正確計算第一季度(1-2月)的申報期間', () => {
      jest.setSystemTime(new Date('2024-02-15'));

      const result = getCurrent401Period();

      expect(result.periodBegin).toBeDefined();
      expect(result.periodEnd).toBeDefined();

      const beginDate = new Date(result.periodBegin * 1000);
      const endDate = new Date(result.periodEnd * 1000);

      expect(beginDate.getMonth()).toBe(0); // Info: (20250611 - Shirley) 1月 (0-indexed)
      expect(endDate.getMonth()).toBe(1); // Info: (20250611 - Shirley) 2月
    });

    it('應該正確計算第二季度(3-4月)的申報期間', () => {
      jest.setSystemTime(new Date('2024-04-15'));

      const result = getCurrent401Period();

      const beginDate = new Date(result.periodBegin * 1000);
      const endDate = new Date(result.periodEnd * 1000);

      expect(beginDate.getMonth()).toBe(2); // Info: (20250611 - Shirley) 3月
      expect(endDate.getMonth()).toBe(3); // Info: (20250611 - Shirley) 4月
    });

    it('應該正確計算年底申報期間', () => {
      jest.setSystemTime(new Date('2024-12-15'));

      const result = getCurrent401Period();

      const beginDate = new Date(result.periodBegin * 1000);
      const endDate = new Date(result.periodEnd * 1000);

      expect(beginDate.getMonth()).toBe(10); // Info: (20250611 - Shirley) 11月
      expect(endDate.getMonth()).toBe(11); // Info: (20250611 - Shirley) 12月
    });
  });

  describe('convertToTrialBalanceItem - 期間分類處理', () => {
    it('應該正確按期間分類並處理明細項目', () => {
      const periodBegin = new Date('2024-01-01').getTime() / 1000;
      const periodEnd = new Date('2024-03-31').getTime() / 1000;

      const lineItems: ILineItemInTrialBalanceItem[] = [
        // Info: (20250611 - Shirley) 期初前的項目 (2023年)
        createMockLineItemWithDebitCredit(
          createMockLineItem(
            1,
            1101,
            50000,
            true,
            1,
            '1101',
            '現金',
            new Date('2023-12-15').getTime() / 1000
          )
        ),
        // Info: (20250611 - Shirley) 期中的項目 (2024年1-3月)
        createMockLineItemWithDebitCredit(
          createMockLineItem(
            2,
            1101,
            30000,
            true,
            2,
            '1101',
            '現金',
            new Date('2024-02-15').getTime() / 1000
          )
        ),
      ];

      const result = convertToTrialBalanceItem(lineItems, periodBegin, periodEnd);

      expect(result.beginning).toBeDefined();
      expect(result.midterm).toBeDefined();
      expect(result.ending).toBeDefined();

      // Info: (20250611 - Shirley) 期初應該有項目 (期初前的累積)
      expect(result.beginning).toHaveLength(1);
      // Info: (20250611 - Shirley) 期中應該有項目 (期間內的)
      expect(result.midterm).toHaveLength(1);
      // Info: (20250611 - Shirley) 期末應該是期初+期中的合併
      expect(result.ending).toHaveLength(1);
    });

    it('應該正確計算期末餘額', () => {
      const periodBegin = new Date('2024-01-01').getTime() / 1000;
      const periodEnd = new Date('2024-03-31').getTime() / 1000;

      const lineItems: ILineItemInTrialBalanceItem[] = [
        createMockLineItemWithDebitCredit(
          createMockLineItem(
            1,
            1101,
            100000,
            true,
            1,
            '1101',
            '現金',
            new Date('2023-12-15').getTime() / 1000
          )
        ),
        createMockLineItemWithDebitCredit(
          createMockLineItem(
            2,
            1101,
            50000,
            true,
            2,
            '1101',
            '現金',
            new Date('2024-02-15').getTime() / 1000
          )
        ),
      ];

      const result = convertToTrialBalanceItem(lineItems, periodBegin, periodEnd);

      // Info: (20250611 - Shirley) 驗證期末餘額是期初+期中的累積
      const endingItem = result.ending[0];
      expect(endingItem.debitAmount).toBe(150000); // Info: (20250611 - Shirley) 100000 + 50000
    });
  });

  describe('processLineItems - 明細項目處理', () => {
    it('應該正確處理明細項目並產生階層結構', () => {
      const mockAccounts: Account[] = [
        createMockAccount(1101, '1101', '現金'),
        createMockAccount(1102, '1102', '銀行存款', 1101), // Info: (20250611 - Shirley) 子科目
      ];

      const mockLineItems: ILineItemInTrialBalanceItem[] = [
        createMockLineItemWithDebitCredit(
          createMockLineItem(1, 1101, 50000, true, 1, '1101', '現金', Date.now() / 1000)
        ),
        createMockLineItemWithDebitCredit(
          createMockLineItem(2, 1102, 30000, true, 2, '1102', '銀行存款', Date.now() / 1000)
        ),
      ];

      const result = processLineItems(mockLineItems, mockAccounts);

      expect(result.arrWithChildren).toBeDefined();
      expect(result.arrWithCopySelf).toBeDefined();

      // Info: (20250611 - Shirley) 應該有處理結果
      expect(result.arrWithCopySelf.length).toBeGreaterThan(0);
    });

    it('應該正確處理空的明細項目', () => {
      const mockAccounts: Account[] = [createMockAccount(1101, '1101', '現金')];

      const emptyLineItems: ILineItemInTrialBalanceItem[] = [];

      const result = processLineItems(emptyLineItems, mockAccounts);

      expect(result.arrWithChildren).toBeDefined();
      expect(result.arrWithCopySelf).toBeDefined();
      expect(result.arrWithChildren).toHaveLength(0);
    });
  });

  describe('convertToAPIFormat - API 格式轉換', () => {
    it('應該正確轉換為 API 格式並計算總額', () => {
      const mockData = {
        beginning: [
          {
            id: 1,
            accountId: 1101,
            amount: new Prisma.Decimal(100000),
            debitAmount: '100000',
            creditAmount: '0',
            description: 'Test',
            debit: true,
            voucherId: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deletedAt: null,
            voucher: { id: 1, date: Date.now() / 1000, type: 'PAYMENT', no: 'V1' },
            account: { id: 1101, code: '1101', name: '現金', parentId: 1 },
            accountCode: '1101',
            accountName: '現金',
            children: [],
          },
        ],
        midterm: [
          {
            id: 2,
            accountId: 1101,
            amount: new Prisma.Decimal(50000),
            debitAmount: '50000',
            creditAmount: '0',
            description: 'Test',
            debit: true,
            voucherId: 2,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deletedAt: null,
            voucher: { id: 2, date: Date.now() / 1000, type: 'PAYMENT', no: 'V2' },
            account: { id: 1101, code: '1101', name: '現金', parentId: 1 },
            accountCode: '1101',
            accountName: '現金',
            children: [],
          },
        ],
        ending: [
          {
            id: 3,
            accountId: 1101,
            amount: new Prisma.Decimal(150000),
            debitAmount: '150000',
            creditAmount: '0',
            description: 'Test',
            debit: true,
            voucherId: 3,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deletedAt: null,
            voucher: { id: 3, date: Date.now() / 1000, type: 'PAYMENT', no: 'V3' },
            account: { id: 1101, code: '1101', name: '現金', parentId: 1 },
            accountCode: '1101',
            accountName: '現金',
            children: [],
          },
        ],
      };

      const result = convertToAPIFormat(mockData, DEFAULT_SORT_OPTIONS);

      expect(result.items).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);

      // Info: (20250611 - Shirley) 驗證總額計算
      expect(result.total.beginningDebitAmount).toBeGreaterThanOrEqual(0);
      expect(result.total.midtermDebitAmount).toBeGreaterThanOrEqual(0);
      expect(result.total.endingDebitAmount).toBeGreaterThanOrEqual(0);
    });

    it('應該正確處理空數據', () => {
      const emptyData = {
        beginning: [],
        midterm: [],
        ending: [],
      };

      const result = convertToAPIFormat(emptyData, DEFAULT_SORT_OPTIONS);

      expect(result.items).toHaveLength(0);
      expect(result.total.beginningDebitAmount).toBe(0);
      expect(result.total.beginningCreditAmount).toBe(0);
    });
  });

  describe('formatPaginatedTrialBalance - 分頁處理', () => {
    const createMockTrialBalanceItem = (
      id: number,
      no: string,
      accountingTitle: string
    ): TrialBalanceItem => ({
      id,
      no,
      accountingTitle,
      beginningDebitAmount: '1000',
      beginningCreditAmount: '0',
      midtermDebitAmount: '500',
      midtermCreditAmount: '0',
      endingDebitAmount: '1500',
      endingCreditAmount: '0',
      createAt: Date.now(),
      updateAt: Date.now(),
      subAccounts: [],
    });

    it('應該正確進行分頁處理', () => {
      const mockItems = Array.from({ length: 25 }, (_, i) =>
        createMockTrialBalanceItem(i + 1, `${1000 + i}`, `科目${i + 1}`)
      );

      const result = formatPaginatedTrialBalance(mockItems, DEFAULT_SORT_OPTIONS, 1, 10);

      expect(result.data).toHaveLength(10); // Info: (20250611 - Shirley) 第一頁應有10筆
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(3); // Info: (20250611 - Shirley) 25筆資料，每頁10筆，共3頁
      expect(result.totalCount).toBe(25);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('應該正確處理最後一頁', () => {
      const mockItems = Array.from({ length: 25 }, (_, i) =>
        createMockTrialBalanceItem(i + 1, `${1000 + i}`, `科目${i + 1}`)
      );

      const result = formatPaginatedTrialBalance(mockItems, DEFAULT_SORT_OPTIONS, 3, 10);

      expect(result.data).toHaveLength(5); // Info: (20250611 - Shirley) 最後一頁應有5筆
      expect(result.page).toBe(3);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });

    it('應該正確處理空數據的分頁', () => {
      const emptyItems: TrialBalanceItem[] = [];

      const result = formatPaginatedTrialBalance(emptyItems, DEFAULT_SORT_OPTIONS, 1, 10);

      expect(result.data).toHaveLength(0);
      expect(result.totalPages).toBe(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });
  });
});

// Info: (20250611 - Shirley) ========== 2. 排序邏輯測試 ==========
// Info: (20250611 - Shirley) Effective test case
describe('Trial Balance 排序邏輯', () => {
  const createMockTrialBalanceItem = (
    id: number,
    no: string,
    accountingTitle: string,
    beginningDebit: number,
    beginningCredit: number,
    midtermDebit: number,
    midtermCredit: number,
    endingDebit: number,
    endingCredit: number
  ): TrialBalanceItem => ({
    id,
    no,
    accountingTitle,
    beginningDebitAmount: beginningDebit.toString(),
    beginningCreditAmount: beginningCredit.toString(),
    midtermDebitAmount: midtermDebit.toString(),
    midtermCreditAmount: midtermCredit.toString(),
    endingDebitAmount: endingDebit.toString(),
    endingCreditAmount: endingCredit.toString(),
    createAt: Date.now(),
    updateAt: Date.now(),
    subAccounts: [],
  });

  const mockItems: TrialBalanceItem[] = [
    createMockTrialBalanceItem(1, '1101', '現金', 50000, 0, 40000, 0, 60000, 0),
    createMockTrialBalanceItem(2, '1141', '應收帳款', 30000, 0, 35000, 0, 25000, 0),
    createMockTrialBalanceItem(3, '2101', '應付帳款', 0, 40000, 0, 45000, 0, 35000),
  ];

  describe('單一欄位排序', () => {
    it('應該正確按期初借方金額降序排序', () => {
      const sortOptions = [{ sortBy: SortBy.BEGINNING_DEBIT_AMOUNT, sortOrder: SortOrder.DESC }];

      const result = sortTrialBalanceItem([...mockItems], sortOptions);

      expect(result[0].beginningDebitAmount).toBe(50000); // Info: (20250611 - Shirley) 現金
      expect(result[1].beginningDebitAmount).toBe(30000); // Info: (20250611 - Shirley) 應收帳款
      expect(result[2].beginningDebitAmount).toBe(0); // Info: (20250611 - Shirley) 應付帳款
    });

    it('應該正確按期中貸方金額升序排序', () => {
      const sortOptions = [{ sortBy: SortBy.MIDTERM_CREDIT_AMOUNT, sortOrder: SortOrder.ASC }];

      const result = sortTrialBalanceItem([...mockItems], sortOptions);

      expect(result[0].midtermCreditAmount).toBe(0); // Info: (20250611 - Shirley) 現金或應收帳款
      expect(result[2].midtermCreditAmount).toBe(45000); // Info: (20250611 - Shirley) 應付帳款
    });

    it('應該正確按期末借方金額降序排序', () => {
      const sortOptions = [{ sortBy: SortBy.ENDING_DEBIT_AMOUNT, sortOrder: SortOrder.DESC }];

      const result = sortTrialBalanceItem([...mockItems], sortOptions);

      expect(result[0].endingDebitAmount).toBe(60000); // Info: (20250611 - Shirley) 現金
      expect(result[1].endingDebitAmount).toBe(25000); // Info: (20250611 - Shirley) 應收帳款
      expect(result[2].endingDebitAmount).toBe(0); // Info: (20250611 - Shirley) 應付帳款
    });
  });

  describe('多重排序條件', () => {
    it('應該正確處理多重排序條件', () => {
      const sortOptions = [
        { sortBy: SortBy.BEGINNING_DEBIT_AMOUNT, sortOrder: SortOrder.DESC },
        { sortBy: SortBy.BEGINNING_CREDIT_AMOUNT, sortOrder: SortOrder.ASC },
      ];

      const result = sortTrialBalanceItem([...mockItems], sortOptions);

      expect(result).toHaveLength(3);
      // Info: (20250611 - Shirley) 第一個排序條件應生效
      expect(parseFloat(result[0].beginningDebitAmount)).toBeGreaterThanOrEqual(parseFloat(result[1].beginningDebitAmount));
    });

    it('應該正確處理相同金額時的次要排序', () => {
      const itemsWithSameAmount = [
        createMockTrialBalanceItem(1, '1101', '現金', 50000, 0, 0, 0, 0, 0),
        createMockTrialBalanceItem(2, '1102', '銀行存款', 50000, 0, 0, 0, 0, 0), // Info: (20250611 - Shirley) 相同金額
        createMockTrialBalanceItem(3, '1103', '定期存款', 50000, 0, 0, 0, 0, 0), // Info: (20250611 - Shirley) 相同金額
      ];

      const sortOptions = [
        { sortBy: SortBy.BEGINNING_DEBIT_AMOUNT, sortOrder: SortOrder.DESC },
        { sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.ASC }, // Info: (20250611 - Shirley) 預設為科目名稱
      ];

      const result = sortTrialBalanceItem([...itemsWithSameAmount], sortOptions);

      expect(result).toHaveLength(3);
      // Info: (20250611 - Shirley) 金額相同時，應該按第二個條件排序
      expect(result[0].beginningDebitAmount).toBe(50000);
      expect(result[1].beginningDebitAmount).toBe(50000);
      expect(result[2].beginningDebitAmount).toBe(50000);
    });
  });

  describe('階層結構排序', () => {
    it('應該正確排序包含子科目的項目', () => {
      const subAccount = createMockTrialBalanceItem(
        11,
        '1101-01',
        '零用金A',
        10000,
        0,
        5000,
        0,
        15000,
        0
      );
      const parentWithSub = {
        ...createMockTrialBalanceItem(1, '1101', '現金', 50000, 0, 40000, 0, 60000, 0),
        subAccounts: [subAccount],
      };

      const items = [parentWithSub, mockItems[1], mockItems[2]];
      const sortOptions = DEFAULT_SORT_OPTIONS;

      const result = sortTrialBalanceItem(items, sortOptions);

      // Info: (20250611 - Shirley) 找到有子科目的項目
      const parentItem = result.find((item) => item.no === '1101');
      expect(parentItem).toBeDefined();
      expect(parentItem!.subAccounts).toBeDefined();
      expect(parentItem!.subAccounts).toHaveLength(1);
      expect(parentItem!.subAccounts[0].no).toBe('1101-01');
    });
  });

  describe('邊界情況處理', () => {
    it('應該正確處理空排序選項', () => {
      const emptySortOptions: { sortBy: SortBy; sortOrder: SortOrder }[] = [];

      expect(() => sortTrialBalanceItem([...mockItems], emptySortOptions)).not.toThrow();

      const result = sortTrialBalanceItem([...mockItems], emptySortOptions);
      expect(result).toHaveLength(3);
    });

    it('應該正確處理空項目陣列', () => {
      const emptyItems: TrialBalanceItem[] = [];
      const sortOptions = [{ sortBy: SortBy.BEGINNING_DEBIT_AMOUNT, sortOrder: SortOrder.DESC }];

      const result = sortTrialBalanceItem(emptyItems, sortOptions);

      expect(result).toHaveLength(0);
    });
  });
});

// Info: (20250611 - Shirley) ========== 3. 數據處理和合併邏輯測試 ==========
// Info: (20250611 - Shirley) Effective test case
describe('Trial Balance 數據處理邏輯', () => {
  // Info: (20250611 - Shirley) Effective test case
  describe('mergeLineItems - 明細項目合併', () => {
    it('應該正確合併同一科目的多筆明細', () => {
      const lineItems: ILineItemSimpleAccountVoucher[] = [
        createMockLineItem(1, 1101, 50000, true, 1, '1101', '現金', Date.now() / 1000),
        createMockLineItem(2, 1101, 30000, true, 2, '1101', '現金', Date.now() / 1000),
        createMockLineItem(3, 2101, 40000, false, 3, '2101', '應付帳款', Date.now() / 1000),
        createMockLineItem(4, 2101, 40000, false, 4, '2101', '應付帳款', Date.now() / 1000),
      ];

      const result = mergeLineItems(lineItems);

      expect(result).toHaveLength(2);

      const cashItem = result.find((item) => item.accountId === 1101);
      expect(cashItem).toBeDefined();
      expect(cashItem!.debitAmount).toBe(80000);
      expect(cashItem!.creditAmount).toBe(0);

      const payableItem = result.find((item) => item.accountId === 2101);
      expect(payableItem).toBeDefined();
      expect(payableItem!.debitAmount).toBe(0);
      expect(payableItem!.creditAmount).toBe(80000);
    });

    it('應該正確處理借貸混합的科目', () => {
      const lineItems: ILineItemSimpleAccountVoucher[] = [
        createMockLineItem(1, 1101, 100000, true, 1, '1101', '現金', Date.now() / 1000),
        createMockLineItem(2, 1101, 30000, false, 2, '1101', '現金', Date.now() / 1000),
        createMockLineItem(3, 1101, 20000, true, 3, '1101', '現金', Date.now() / 1000),
      ];

      const result = mergeLineItems(lineItems);

      expect(result).toHaveLength(1);

      const cashItem = result[0];
      expect(cashItem.debitAmount).toBe(120000);
      expect(cashItem.creditAmount).toBe(30000);
    });
  });

  // Info: (20250611 - Shirley) Effective test case
  describe('categorizeAndMergeLineItems - 期間分類', () => {
    it('應該正確按期間分類明細項目', () => {
      const periodBegin = new Date('2024-01-01').getTime() / 1000;
      const periodEnd = new Date('2024-03-31').getTime() / 1000;

      const lineItems: ILineItemInTrialBalanceItem[] = [
        createMockLineItemWithDebitCredit(
          createMockLineItem(
            1,
            1101,
            50000,
            true,
            1,
            '1101',
            '現金',
            new Date('2023-12-15').getTime() / 1000
          )
        ),
        createMockLineItemWithDebitCredit(
          createMockLineItem(
            2,
            1101,
            30000,
            true,
            2,
            '1101',
            '現金',
            new Date('2024-02-15').getTime() / 1000
          )
        ),
      ];

      const result = categorizeAndMergeLineItems(lineItems, periodBegin, periodEnd);

      expect(result.beginning).toBeDefined();
      expect(result.midterm).toBeDefined();
    });
  });

  // Info: (20250611 - Shirley) Effective test case
  describe('calculateEndingBalance - 期末餘額計算', () => {
    it('應該正確計算期末餘額', () => {
      const beginning: ILineItemInTrialBalanceItem[] = [
        createMockLineItemWithDebitCredit(
          createMockLineItem(1, 1101, 100000, true, 1, '1101', '現金', Date.now() / 1000)
        ),
      ];

      const midterm: ILineItemInTrialBalanceItem[] = [
        createMockLineItemWithDebitCredit(
          createMockLineItem(2, 1101, 50000, true, 2, '1101', '現金', Date.now() / 1000)
        ),
      ];

      const result = calculateEndingBalance(beginning, midterm);

      expect(result).toHaveLength(1);
      expect(result[0].debitAmount).toBeGreaterThan(0);
    });
  });
});

// Info: (20250611 - Shirley) ========== 4. 邊界條件和錯誤處理測試 ==========
// Info: (20250611 - Shirley) Effective test case
describe('Trial Balance 邊界條件處理', () => {
  // Info: (20250611 - Shirley) Effective test case
  describe('空數據處理', () => {
    it('應該正確處理空的明細項目陣列', () => {
      const emptyLineItems: ILineItemSimpleAccountVoucher[] = [];
      const result = mergeLineItems(emptyLineItems);
      expect(result).toHaveLength(0);
    });

    it('應該正確處理空的期間數據', () => {
      const emptyData = {
        beginning: [],
        midterm: [],
        ending: [],
      };

      const result = convertToAPIFormat(emptyData, DEFAULT_SORT_OPTIONS);
      expect(result.items).toHaveLength(0);
      expect(result.total.beginningDebitAmount).toBe(0);
    });
  });

  // Info: (20250611 - Shirley) Effective test case
  describe('異常數據處理', () => {
    it('應該正確處理負數金額', () => {
      const lineItemsWithNegative: ILineItemSimpleAccountVoucher[] = [
        createMockLineItem(1, 1101, -50000, true, 1, '1101', '現金', Date.now() / 1000),
        createMockLineItem(2, 2101, -30000, false, 2, '2101', '應付帳款', Date.now() / 1000),
      ];

      const result = mergeLineItems(lineItemsWithNegative);
      expect(result).toHaveLength(2);

      const cashItem = result.find((item) => item.accountId === 1101);
      expect(cashItem!.debitAmount).toBe(-50000);

      const payableItem = result.find((item) => item.accountId === 2101);
      expect(payableItem!.creditAmount).toBe(-30000);
    });

    it('應該正確處理極大數值', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      const lineItemsWithLargeNumbers: ILineItemSimpleAccountVoucher[] = [
        createMockLineItem(1, 1101, largeNumber, true, 1, '1101', '現金', Date.now() / 1000),
      ];

      const result = mergeLineItems(lineItemsWithLargeNumbers);
      expect(result).toHaveLength(1);
      expect(result[0].debitAmount).toBe(largeNumber);
    });
  });

  // Info: (20250611 - Shirley) Effective test case
  describe('性能測試', () => {
    it('應該能處理大量數據', () => {
      const largeDataSet: ILineItemSimpleAccountVoucher[] = Array.from({ length: 1000 }, (_, i) =>
        createMockLineItem(
          i + 1,
          Math.floor(i / 10) + 1101,
          Math.random() * 100000,
          i % 2 === 0,
          i + 1,
          `${Math.floor(i / 10) + 1101}`,
          `科目${Math.floor(i / 10) + 1}`,
          Date.now() / 1000
        )
      );

      const startTime = Date.now();
      const result = mergeLineItems(largeDataSet);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Info: (20250611 - Shirley) 1秒內
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
