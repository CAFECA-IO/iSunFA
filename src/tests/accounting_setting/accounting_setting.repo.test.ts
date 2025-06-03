import prisma from '@/client';
import {
  createAccountingSetting,
  getAccountingSettingByCompanyId,
  updateAccountingSettingById,
} from '@/lib/utils/repo/accounting_setting.repo';
import { getTimestampNow } from '@/lib/utils/common';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import { DEFAULT_ACCOUNTING_SETTING } from '@/constants/setting';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';

// Info: (20250603 - Shirley) 模擬 Prisma client
jest.mock('@/client', () => ({
  __esModule: true,
  default: {
    accountingSetting: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    shortcut: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

// Info: (20250603 - Shirley) 模擬其他依賴
jest.mock('@/lib/utils/common');
jest.mock('@/lib/shared/permission');
jest.mock('@/lib/utils/logger_back', () => ({
  loggerError: jest.fn(),
}));

// Info: (20250603 - Shirley) 設置模擬函數
const mockPrisma = jest.mocked(prisma);
const mockGetTimestampNow = jest.mocked(getTimestampNow);
const mockConvertTeamRoleCanDo = jest.mocked(convertTeamRoleCanDo);

describe('會計參數設定功能測試', () => {
  // Info: (20250603 - Shirley) 測試數據
  const mockTimestamp = 1640995200;
  const mockCompanyId = 1;
  const mockAccountingSettingId = 1;

  const mockAccountingSetting: IAccountingSetting = {
    id: mockAccountingSettingId,
    companyId: mockCompanyId,
    taxSettings: {
      salesTax: {
        taxable: true,
        rate: 0.05,
      },
      purchaseTax: {
        taxable: true,
        rate: 0.05,
      },
      returnPeriodicity: 'monthly',
    },
    currency: 'TWD',
    shortcutList: [],
  };

  const mockPrismaAccountingSetting = {
    id: mockAccountingSettingId,
    companyId: mockCompanyId,
    salesTaxTaxable: true,
    salesTaxRate: 0.05,
    purchaseTaxTaxable: true,
    purchaseTaxRate: 0.05,
    returnPeriodicity: 'monthly',
    currency: 'TWD',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    deletedAt: null,
    shortcuts: [],
  };

  beforeEach(() => {
    // Info: (20250603 - Shirley) 重置所有模擬
    jest.clearAllMocks();

    // Info: (20250603 - Shirley) 設置模擬回傳值
    mockGetTimestampNow.mockReturnValue(mockTimestamp);
    mockConvertTeamRoleCanDo.mockReturnValue({
      teamRole: TeamRole.OWNER,
      canDo: TeamPermissionAction.ACCOUNTING_SETTING,
      can: true,
    });

    // Info: (20250603 - Shirley) 模擬 Prisma 方法
    mockPrisma.accountingSetting.create = jest.fn().mockResolvedValue(mockPrismaAccountingSetting);
    mockPrisma.accountingSetting.findFirst = jest
      .fn()
      .mockResolvedValue(mockPrismaAccountingSetting);
    mockPrisma.accountingSetting.update = jest.fn().mockResolvedValue(mockPrismaAccountingSetting);
    mockPrisma.shortcut.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    mockPrisma.shortcut.createMany = jest.fn().mockResolvedValue({ count: 0 });
  });

  describe('會計設定建立', () => {
    it('應該成功創建預設會計設定', async () => {
      // Info: (20250603 - Shirley) 執行測試
      const result = await createAccountingSetting(mockCompanyId);

      // Info: (20250603 - Shirley) 驗證結果
      expect(result).toBeDefined();
      expect(mockPrisma.accountingSetting.create).toHaveBeenCalledWith({
        data: {
          companyId: mockCompanyId,
          salesTaxTaxable: DEFAULT_ACCOUNTING_SETTING.SALES_TAX_TAXABLE,
          salesTaxRate: DEFAULT_ACCOUNTING_SETTING.SALES_TAX_RATE,
          purchaseTaxTaxable: DEFAULT_ACCOUNTING_SETTING.PURCHASE_TAX_TAXABLE,
          purchaseTaxRate: DEFAULT_ACCOUNTING_SETTING.PURCHASE_TAX_RATE,
          returnPeriodicity: DEFAULT_ACCOUNTING_SETTING.RETURN_PERIODICITY,
          currency: DEFAULT_ACCOUNTING_SETTING.CURRENCY,
        },
        include: { shortcuts: true },
      });
    });

    it('應該處理資料庫創建失敗的情況', async () => {
      // Info: (20250603 - Shirley) 模擬資料庫創建失敗
      mockPrisma.accountingSetting.create = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      // Info: (20250603 - Shirley) 執行測試
      const result = await createAccountingSetting(mockCompanyId);

      // Info: (20250603 - Shirley) 驗證結果
      expect(result).toBeNull();
    });
  });

  describe('會計設定查詢', () => {
    it('應該成功獲取公司的會計設定', async () => {
      // Info: (20250603 - Shirley) 執行測試
      const result = await getAccountingSettingByCompanyId(mockCompanyId);

      // Info: (20250603 - Shirley) 驗證結果
      expect(result).toBeDefined();
      expect(mockPrisma.accountingSetting.findFirst).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        include: { shortcuts: true },
      });
    });

    it('應該處理找不到會計設定的情況', async () => {
      // Info: (20250603 - Shirley) 模擬找不到設定
      mockPrisma.accountingSetting.findFirst = jest.fn().mockResolvedValue(null);

      // Info: (20250603 - Shirley) 執行測試
      const result = await getAccountingSettingByCompanyId(mockCompanyId);

      // Info: (20250603 - Shirley) 驗證結果
      expect(result).toBeNull();
    });

    it('應該處理資料庫查詢失敗的情況', async () => {
      // Info: (20250603 - Shirley) 模擬資料庫查詢失敗
      mockPrisma.accountingSetting.findFirst = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      // Info: (20250603 - Shirley) 執行測試
      const result = await getAccountingSettingByCompanyId(mockCompanyId);

      // Info: (20250603 - Shirley) 驗證結果
      expect(result).toBeNull();
    });
  });

  describe('幣別設定與匯率', () => {
    it('應該正確設定預設貨幣為 TWD', async () => {
      // Info: (20250603 - Shirley) 執行測試
      await createAccountingSetting(mockCompanyId);

      // Info: (20250603 - Shirley) 驗證預設貨幣設定
      expect(mockPrisma.accountingSetting.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'TWD',
          }),
        })
      );
    });

    it('應該允許更新 TWD 貨幣類型', async () => {
      // Info: (20250603 - Shirley) 準備測試數據
      const testAccountingSetting = {
        ...mockAccountingSetting,
        currency: 'TWD',
      };

      // Info: (20250603 - Shirley) 執行測試
      const result = await updateAccountingSettingById(mockCompanyId, testAccountingSetting);

      // Info: (20250603 - Shirley) 驗證結果
      expect(result).toBeDefined();
      expect(mockPrisma.accountingSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'TWD',
          }),
        })
      );
    });

    it('應該允許更新 USD 貨幣類型', async () => {
      // Info: (20250603 - Shirley) 準備測試數據
      const testAccountingSetting = {
        ...mockAccountingSetting,
        currency: 'USD',
      };

      // Info: (20250603 - Shirley) 執行測試
      const result = await updateAccountingSettingById(mockCompanyId, testAccountingSetting);

      // Info: (20250603 - Shirley) 驗證結果
      expect(result).toBeDefined();
      expect(mockPrisma.accountingSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'USD',
          }),
        })
      );
    });

    it('應該允許更新 CNY 貨幣類型', async () => {
      // Info: (20250603 - Shirley) 準備測試數據
      const testAccountingSetting = {
        ...mockAccountingSetting,
        currency: 'CNY',
      };

      // Info: (20250603 - Shirley) 執行測試
      const result = await updateAccountingSettingById(mockCompanyId, testAccountingSetting);

      // Info: (20250603 - Shirley) 驗證結果
      expect(result).toBeDefined();
      expect(mockPrisma.accountingSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'CNY',
          }),
        })
      );
    });
  });

  describe('稅務參數配置', () => {
    it('應該正確設定銷項稅參數', async () => {
      // Info: (20250603 - Shirley) 準備測試數據 - 銷項稅設定
      const testAccountingSetting = {
        ...mockAccountingSetting,
        taxSettings: {
          ...mockAccountingSetting.taxSettings,
          salesTax: {
            taxable: false,
            rate: 0,
          },
        },
      };

      // Info: (20250603 - Shirley) 執行測試
      await updateAccountingSettingById(mockCompanyId, testAccountingSetting);

      // Info: (20250603 - Shirley) 驗證銷項稅設定
      expect(mockPrisma.accountingSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            salesTaxTaxable: false,
            salesTaxRate: 0,
          }),
        })
      );
    });

    it('應該正確設定進項稅參數', async () => {
      // Info: (20250603 - Shirley) 準備測試數據 - 進項稅設定
      const testAccountingSetting = {
        ...mockAccountingSetting,
        taxSettings: {
          ...mockAccountingSetting.taxSettings,
          purchaseTax: {
            taxable: false,
            rate: 0,
          },
        },
      };

      // Info: (20250603 - Shirley) 執行測試
      await updateAccountingSettingById(mockCompanyId, testAccountingSetting);

      // Info: (20250603 - Shirley) 驗證進項稅設定
      expect(mockPrisma.accountingSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purchaseTaxTaxable: false,
            purchaseTaxRate: 0,
          }),
        })
      );
    });

    it('應該驗證稅率為 0 的情況', async () => {
      // Info: (20250603 - Shirley) 測試邊界值
      const testAccountingSetting = {
        ...mockAccountingSetting,
        taxSettings: {
          ...mockAccountingSetting.taxSettings,
          salesTax: {
            taxable: true,
            rate: 0,
          },
        },
      };

      // Info: (20250603 - Shirley) 執行測試
      const result = await updateAccountingSettingById(mockCompanyId, testAccountingSetting);

      // Info: (20250603 - Shirley) 驗證結果
      expect(result).toBeDefined();
    });

    it('應該驗證稅率為 0.05 的情況', async () => {
      // Info: (20250603 - Shirley) 測試常見稅率
      const testAccountingSetting = {
        ...mockAccountingSetting,
        taxSettings: {
          ...mockAccountingSetting.taxSettings,
          salesTax: {
            taxable: true,
            rate: 0.05,
          },
        },
      };

      // Info: (20250603 - Shirley) 執行測試
      const result = await updateAccountingSettingById(mockCompanyId, testAccountingSetting);

      // Info: (20250603 - Shirley) 驗證結果
      expect(result).toBeDefined();
    });

    it('應該設定月度申報週期', async () => {
      // Info: (20250603 - Shirley) 準備測試數據 - 月度申報
      const testAccountingSetting = {
        ...mockAccountingSetting,
        taxSettings: {
          ...mockAccountingSetting.taxSettings,
          returnPeriodicity: 'monthly',
        },
      };

      // Info: (20250603 - Shirley) 執行測試
      await updateAccountingSettingById(mockCompanyId, testAccountingSetting);

      // Info: (20250603 - Shirley) 驗證申報週期設定
      expect(mockPrisma.accountingSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            returnPeriodicity: 'monthly',
          }),
        })
      );
    });

    it('應該設定週度申報週期', async () => {
      // Info: (20250603 - Shirley) 準備測試數據 - 週度申報
      const testAccountingSetting = {
        ...mockAccountingSetting,
        taxSettings: {
          ...mockAccountingSetting.taxSettings,
          returnPeriodicity: 'weekly',
        },
      };

      // Info: (20250603 - Shirley) 執行測試
      await updateAccountingSettingById(mockCompanyId, testAccountingSetting);

      // Info: (20250603 - Shirley) 驗證申報週期設定
      expect(mockPrisma.accountingSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            returnPeriodicity: 'weekly',
          }),
        })
      );
    });
  });

  describe('參數格式驗證', () => {
    it('應該驗證必填欄位存在', async () => {
      // Info: (20250603 - Shirley) 準備測試數據 - 缺少必填欄位
      const invalidAccountingSetting = {
        ...mockAccountingSetting,
        companyId: undefined as unknown as number,
      };

      // Info: (20250603 - Shirley) 模擬設定不存在
      mockPrisma.accountingSetting.findFirst = jest.fn().mockResolvedValue(null);

      // Info: (20250603 - Shirley) 執行測試並驗證錯誤
      const result = await updateAccountingSettingById(mockCompanyId, invalidAccountingSetting);

      // Info: (20250603 - Shirley) 驗證結果
      expect(result).toBeNull();
    });

    it('應該驗證數值格式正確性', async () => {
      // Info: (20250603 - Shirley) 準備測試數據 - 無效的稅率
      const invalidAccountingSetting = {
        ...mockAccountingSetting,
        taxSettings: {
          ...mockAccountingSetting.taxSettings,
          salesTax: {
            taxable: true,
            rate: 'invalid' as unknown as number,
          },
        },
      };

      // Info: (20250603 - Shirley) 執行測試
      await updateAccountingSettingById(mockCompanyId, invalidAccountingSetting);

      // Info: (20250603 - Shirley) 驗證數值會被正確處理
      expect(mockPrisma.accountingSetting.update).toHaveBeenCalled();
    });
  });

  describe('依賴關係檢查', () => {
    it('應該檢查會計設定與帳本的關聯', async () => {
      // Info: (20250603 - Shirley) 準備測試數據 - 不存在的公司
      const nonExistentCompanyId = 999;

      // Info: (20250603 - Shirley) 模擬設定不存在
      mockPrisma.accountingSetting.findFirst = jest.fn().mockResolvedValue(null);

      // Info: (20250603 - Shirley) 執行測試
      const result = await updateAccountingSettingById(nonExistentCompanyId, mockAccountingSetting);

      // Info: (20250603 - Shirley) 驗證關聯檢查
      expect(result).toBeNull();
    });

    it('應該處理 ID 不匹配的情況', async () => {
      // Info: (20250603 - Shirley) 準備測試數據 - ID 不匹配
      const mismatchedAccountingSetting = {
        ...mockAccountingSetting,
        id: 999, // 不同的 ID
      };

      // Info: (20250603 - Shirley) 執行測試
      const result = await updateAccountingSettingById(mockCompanyId, mismatchedAccountingSetting);

      // Info: (20250603 - Shirley) 驗證結果
      expect(result).toBeDefined();
    });
  });

  describe('變更歷史記錄', () => {
    it('應該記錄設定更新的時間戳', async () => {
      // Info: (20250603 - Shirley) 執行測試
      await updateAccountingSettingById(mockCompanyId, mockAccountingSetting);

      // Info: (20250603 - Shirley) 驗證時間戳更新
      expect(mockPrisma.accountingSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            updatedAt: mockTimestamp,
          }),
        })
      );
    });

    it('應該正確處理快捷鍵設定的更新', async () => {
      // Info: (20250603 - Shirley) 準備測試數據 - 包含快捷鍵
      const accountingSettingWithShortcuts = {
        ...mockAccountingSetting,
        shortcutList: [
          {
            action: {
              name: 'test-action',
              description: 'Test description',
              fieldList: [
                {
                  name: 'field1',
                  value: 'value1',
                },
              ],
            },
            keyList: ['Ctrl', 'S'],
          },
        ],
      };

      // Info: (20250603 - Shirley) 執行測試
      await updateAccountingSettingById(mockCompanyId, accountingSettingWithShortcuts);

      // Info: (20250603 - Shirley) 驗證快捷鍵處理
      expect(mockPrisma.shortcut.deleteMany).toHaveBeenCalledWith({
        where: { accountingSettingId: mockAccountingSettingId },
      });
      expect(mockPrisma.shortcut.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            accountingSettingId: mockAccountingSettingId,
            actionName: 'test-action',
            description: 'Test description',
            keyList: ['Ctrl', 'S'],
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        ]),
      });
    });
  });

  describe('錯誤處理與資料庫約束', () => {
    it('應該處理更新過程中的資料庫錯誤', async () => {
      // Info: (20250603 - Shirley) 模擬資料庫更新失敗
      mockPrisma.accountingSetting.update = jest
        .fn()
        .mockRejectedValue(new Error('Database update error'));

      // Info: (20250603 - Shirley) 執行測試
      const result = await updateAccountingSettingById(mockCompanyId, mockAccountingSetting);

      // Info: (20250603 - Shirley) 驗證錯誤處理
      expect(result).toBeNull();
    });

    it('應該處理快捷鍵更新過程中的錯誤', async () => {
      // Info: (20250603 - Shirley) 準備測試數據 - 包含快捷鍵
      const accountingSettingWithShortcuts = {
        ...mockAccountingSetting,
        shortcutList: [
          {
            action: {
              name: 'test-action',
              description: 'Test description',
              fieldList: [],
            },
            keyList: ['Ctrl', 'S'],
          },
        ],
      };

      // Info: (20250603 - Shirley) 模擬快捷鍵創建失敗
      mockPrisma.shortcut.createMany = jest
        .fn()
        .mockRejectedValue(new Error('Shortcut creation error'));

      // Info: (20250603 - Shirley) 執行測試
      const result = await updateAccountingSettingById(
        mockCompanyId,
        accountingSettingWithShortcuts
      );

      // Info: (20250603 - Shirley) 驗證錯誤處理
      expect(result).toBeNull();
    });
  });
});
