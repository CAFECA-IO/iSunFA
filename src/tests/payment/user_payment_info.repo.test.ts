import prisma from '@/client';
import { getTimestampNow } from '@/lib/utils/common';
import { loggerError } from '@/lib/utils/logger_back';
import {
  getUserPaymentInfoById,
  listUserPaymentInfo,
  listUserPaymentMethod,
  createUserPaymentInfo,
  createDefaultUserPaymentInfo,
  unsetDefaultUserPaymentMethod,
} from '@/lib/utils/repo/user_payment_info.repo';
import { IPaymentInfo, IPaymentMethod } from '@/interfaces/payment';
import { PAYMENT_METHOD_TYPE } from '@/constants/payment';
import { DefaultValue } from '@/constants/default_value';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { JsonValue } from '@prisma/client/runtime/library';

// Info: (20250604 - Shirley) 模擬 Prisma client
jest.mock('@/client', () => ({
  __esModule: true,
  default: {
    userPaymentInfo: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

// Info: (20250604 - Shirley) 模擬工具函數
jest.mock('@/lib/utils/common', () => ({
  getTimestampNow: jest.fn(() => 1640995200), // Info: (20250604 - Shirley) 2022-01-01 00:00:00 UTC
}));

jest.mock('@/lib/utils/logger_back', () => ({
  loggerError: jest.fn(),
}));

const mockPrisma = jest.mocked(prisma);
const mockGetTimestampNow = jest.mocked(getTimestampNow);
const mockLoggerError = jest.mocked(loggerError);

describe('UserPaymentInfo Repository 測試', () => {
  const mockUserId = 123;
  const mockPaymentMethodId = 456;
  const mockTimestamp = 1640995200;

  const mockPaymentMethod: IPaymentMethod = {
    type: PAYMENT_METHOD_TYPE.VISA,
    number: '1234567890123456',
    expirationDate: '12/25',
    cvv: '123',
  };

  const mockPaymentInfo: IPaymentInfo = {
    id: mockPaymentMethodId,
    userId: mockUserId,
    token: 'test-token-123',
    transactionId: 'txn-456',
    default: true,
    detail: mockPaymentMethod,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  };

  const mockPrismaPaymentInfo = {
    id: mockPaymentMethodId,
    userId: mockUserId,
    token: 'test-token-123',
    transactionId: 'txn-456',
    default: true,
    detail: mockPaymentMethod as unknown as JsonValue,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTimestampNow.mockReturnValue(mockTimestamp);
  });

  describe('getUserPaymentInfoById', () => {
    it('應該成功獲取付費資訊', async () => {
      // Info: (20250604 - Shirley) 準備
      mockPrisma.userPaymentInfo.findFirst.mockResolvedValue(mockPrismaPaymentInfo);

      // Info: (20250604 - Shirley) 執行
      const result = await getUserPaymentInfoById(mockPaymentMethodId);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toEqual(mockPaymentInfo);
      expect(mockPrisma.userPaymentInfo.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockPaymentMethodId,
          deletedAt: null,
        },
      });
    });

    it('應該在找不到付費資訊時返回 null', async () => {
      // Info: (20250604 - Shirley) 準備
      mockPrisma.userPaymentInfo.findFirst.mockResolvedValue(null);

      // Info: (20250604 - Shirley) 執行
      const result = await getUserPaymentInfoById(999);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toBeNull();
    });

    it('應該正確處理 transaction client', async () => {
      // Info: (20250604 - Shirley) 準備
      const mockTx = {
        userPaymentInfo: {
          findFirst: jest.fn().mockResolvedValue(mockPrismaPaymentInfo),
        },
      };

      // Info: (20250604 - Shirley) 執行
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getUserPaymentInfoById(mockPaymentMethodId, mockTx as any);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toEqual(mockPaymentInfo);
      expect(mockTx.userPaymentInfo.findFirst).toHaveBeenCalled();
      expect(mockPrisma.userPaymentInfo.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('listUserPaymentInfo', () => {
    it('應該成功列出用戶所有付費資訊', async () => {
      // Info: (20250604 - Shirley) 準備
      const mockPaymentInfoList = [mockPrismaPaymentInfo];
      mockPrisma.userPaymentInfo.findMany.mockResolvedValue(mockPaymentInfoList);

      // Info: (20250604 - Shirley) 執行
      const result = await listUserPaymentInfo(mockUserId);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toHaveLength(1);
      expect(result[0].detail.number).toBe(
        `${DefaultValue.PAYMENT_METHOD_NUMBER.slice(0, -4)} 3456`
      );
      expect(result[0].detail.cvv).toBe(DefaultValue.PAYMENT_METHOD_CVV);
      expect(mockPrisma.userPaymentInfo.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          deletedAt: null,
        },
        orderBy: {
          default: 'desc',
        },
      });
    });

    it('應該在用戶 ID 無效時返回空陣列', async () => {
      // Info: (20250604 - Shirley) 執行
      const result = await listUserPaymentInfo(0);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toEqual([]);
      expect(mockPrisma.userPaymentInfo.findMany).not.toHaveBeenCalled();
    });

    it('應該在沒有付費資訊時返回空陣列', async () => {
      // Info: (20250604 - Shirley) 準備
      mockPrisma.userPaymentInfo.findMany.mockResolvedValue([]);

      // Info: (20250604 - Shirley) 執行
      const result = await listUserPaymentInfo(mockUserId);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toEqual([]);
    });

    it('應該正確遮蔽敏感資訊', async () => {
      // Info: (20250604 - Shirley) 準備
      const sensitivePaymentInfo = {
        ...mockPrismaPaymentInfo,
        detail: {
          ...mockPaymentMethod,
          number: '4111111111111111',
          cvv: '999',
        } as unknown as JsonValue,
      };
      mockPrisma.userPaymentInfo.findMany.mockResolvedValue([sensitivePaymentInfo]);

      // Info: (20250604 - Shirley) 執行
      const result = await listUserPaymentInfo(mockUserId);

      // Info: (20250604 - Shirley) 驗證
      expect(result[0].detail.number).toBe(
        `${DefaultValue.PAYMENT_METHOD_NUMBER.slice(0, -4)} 1111`
      );
      expect(result[0].detail.cvv).toBe(DefaultValue.PAYMENT_METHOD_CVV);
    });
  });

  describe('listUserPaymentMethod', () => {
    it('應該成功列出用戶付費方式摘要', async () => {
      // Info: (20250604 - Shirley) 準備
      const mockPaymentInfoList = [mockPrismaPaymentInfo];
      mockPrisma.userPaymentInfo.findMany.mockResolvedValue(mockPaymentInfoList);

      // Info: (20250604 - Shirley) 執行
      const result = await listUserPaymentMethod(mockUserId);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: PAYMENT_METHOD_TYPE.VISA,
        number: expect.stringContaining('****'),
        cvv: DefaultValue.PAYMENT_METHOD_CVV,
      });
    });
  });

  describe('createUserPaymentInfo', () => {
    it('應該成功建立用戶付費資訊', async () => {
      // Info: (20250604 - Shirley) 準備
      const newPaymentInfo: IPaymentInfo = {
        userId: mockUserId,
        token: 'new-token-123',
        transactionId: 'new-txn-456',
        default: false,
        detail: mockPaymentMethod,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockPrisma.userPaymentInfo.create.mockResolvedValue({
        ...mockPrismaPaymentInfo,
        id: 789,
        token: 'new-token-123',
        transactionId: 'new-txn-456',
        default: false,
      });

      // Info: (20250604 - Shirley) 執行
      const result = await createUserPaymentInfo(newPaymentInfo);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toMatchObject({
        id: 789,
        userId: mockUserId,
        token: 'new-token-123',
        transactionId: 'new-txn-456',
        default: false,
      });
      expect(mockPrisma.userPaymentInfo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          token: 'new-token-123',
          transactionId: 'new-txn-456',
          default: false,
          detail: expect.objectContaining({
            type: PAYMENT_METHOD_TYPE.VISA,
            number: '1234567890123456',
          }),
        }),
      });
    });

    it('應該使用預設值處理缺失的付費方式資訊', async () => {
      // Info: (20250604 - Shirley) 準備
      const incompletePaymentInfo: IPaymentInfo = {
        userId: mockUserId,
        token: 'token-123',
        transactionId: 'txn-456',
        default: true,
        detail: {} as IPaymentMethod,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockPrisma.userPaymentInfo.create.mockResolvedValue(mockPrismaPaymentInfo);

      // Info: (20250604 - Shirley) 執行
      await createUserPaymentInfo(incompletePaymentInfo);

      // Info: (20250604 - Shirley) 驗證
      expect(mockPrisma.userPaymentInfo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          detail: {
            type: PAYMENT_METHOD_TYPE.OTHER,
            number: DefaultValue.PAYMENT_METHOD_NUMBER,
            expirationDate: DefaultValue.PAYMENT_METHOD_EXPIRATION_DATE,
            cvv: DefaultValue.PAYMENT_METHOD_CVV,
          },
        }),
      });
    });

    it('應該在建立失敗時拋出錯誤', async () => {
      // Info: (20250604 - Shirley) 準備
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.userPaymentInfo.create.mockResolvedValue(null as any);

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(createUserPaymentInfo(mockPaymentInfo)).rejects.toThrow(
        STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR
      );
    });

    it('應該自動設定建立和更新時間', async () => {
      // Info: (20250604 - Shirley) 準備
      const paymentInfoWithoutTime: IPaymentInfo = {
        userId: mockUserId,
        token: 'token-123',
        transactionId: 'txn-456',
        default: true,
        detail: mockPaymentMethod,
        createdAt: 0, // Info: (20250604 - Shirley) 將被覆蓋
        updatedAt: 0, // Info: (20250604 - Shirley) 將被覆蓋
      };

      mockPrisma.userPaymentInfo.create.mockResolvedValue(mockPrismaPaymentInfo);

      // Info: (20250604 - Shirley) 執行
      await createUserPaymentInfo(paymentInfoWithoutTime);

      // Info: (20250604 - Shirley) 驗證
      expect(mockPrisma.userPaymentInfo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      });
    });
  });

  describe('unsetDefaultUserPaymentMethod', () => {
    it('應該成功取消用戶預設付費方式', async () => {
      // Info: (20250604 - Shirley) 準備
      mockPrisma.userPaymentInfo.updateMany.mockResolvedValue({ count: 1 });

      // Info: (20250604 - Shirley) 執行
      await unsetDefaultUserPaymentMethod(mockUserId);

      // Info: (20250604 - Shirley) 驗證
      expect(mockPrisma.userPaymentInfo.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          default: true,
        },
        data: {
          default: false,
        },
      });
    });

    it('應該在用戶 ID 無效時直接返回', async () => {
      // Info: (20250604 - Shirley) 執行
      await unsetDefaultUserPaymentMethod(0);

      // Info: (20250604 - Shirley) 驗證
      expect(mockPrisma.userPaymentInfo.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('createDefaultUserPaymentInfo', () => {
    it('應該成功建立預設付費資訊', async () => {
      // Info: (20250604 - Shirley) 準備
      const defaultPaymentInfo: IPaymentInfo = {
        ...mockPaymentInfo,
        default: true,
      };

      mockPrisma.userPaymentInfo.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.userPaymentInfo.create.mockResolvedValue(mockPrismaPaymentInfo);

      // Info: (20250604 - Shirley) 執行
      const result = await createDefaultUserPaymentInfo(defaultPaymentInfo);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toMatchObject({
        id: mockPaymentMethodId,
        userId: mockUserId,
        token: 'test-token-123',
        default: true,
      });
      expect(mockPrisma.userPaymentInfo.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          default: true,
        },
        data: {
          default: false,
        },
      });
    });

    it('應該在非預設付費資訊時不取消其他預設設定', async () => {
      // Info: (20250604 - Shirley) 準備
      const nonDefaultPaymentInfo: IPaymentInfo = {
        ...mockPaymentInfo,
        default: false,
      };

      mockPrisma.userPaymentInfo.create.mockResolvedValue({
        ...mockPrismaPaymentInfo,
        default: false,
      });

      // Info: (20250604 - Shirley) 執行
      await createDefaultUserPaymentInfo(nonDefaultPaymentInfo);

      // Info: (20250604 - Shirley) 驗證
      expect(mockPrisma.userPaymentInfo.updateMany).not.toHaveBeenCalled();
    });

    it('應該在建立失敗時記錄錯誤並拋出異常', async () => {
      // Info: (20250604 - Shirley) 準備
      const error = new Error('Database error');
      mockPrisma.userPaymentInfo.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.userPaymentInfo.create.mockRejectedValue(error);

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(createDefaultUserPaymentInfo(mockPaymentInfo)).rejects.toThrow(
        STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR
      );

      expect(mockLoggerError).toHaveBeenCalledWith({
        userId: mockUserId,
        errorType: STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR,
        errorMessage: error,
      });
    });

    it('應該正確處理 transaction client', async () => {
      // Info: (20250604 - Shirley) 準備
      const mockTx = {
        userPaymentInfo: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue(mockPrismaPaymentInfo),
        },
      };

      // Info: (20250604 - Shirley) 執行
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await createDefaultUserPaymentInfo(mockPaymentInfo, mockTx as any);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toMatchObject({
        id: mockPaymentMethodId,
        userId: mockUserId,
        token: 'test-token-123',
        default: true,
      });
      expect(mockTx.userPaymentInfo.updateMany).toHaveBeenCalled();
      expect(mockTx.userPaymentInfo.create).toHaveBeenCalled();
      expect(mockPrisma.userPaymentInfo.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.userPaymentInfo.create).not.toHaveBeenCalled();
    });
  });

  describe('邊界條件和錯誤處理', () => {
    it('應該處理空的用戶 ID', async () => {
      // Info: (20250604 - Shirley) 執行
      const result = await listUserPaymentInfo(null as unknown as number);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toEqual([]);
    });

    it('應該處理無效的付費方式 ID', async () => {
      // Info: (20250604 - Shirley) 準備
      mockPrisma.userPaymentInfo.findFirst.mockResolvedValue(null);

      // Info: (20250604 - Shirley) 執行
      const result = await getUserPaymentInfoById(-1);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toBeNull();
    });

    it('應該處理資料庫連接錯誤', async () => {
      // Info: (20250604 - Shirley) 準備
      const dbError = new Error('Connection failed');
      mockPrisma.userPaymentInfo.findFirst.mockRejectedValue(dbError);

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(getUserPaymentInfoById(mockPaymentMethodId)).rejects.toThrow(
        'Connection failed'
      );
    });

    it('應該處理格式異常的付費方式資料時不拋出錯誤', async () => {
      // Info: (20250604 - Shirley) 準備
      const malformedData = {
        ...mockPrismaPaymentInfo,
        detail: null as JsonValue,
      };
      mockPrisma.userPaymentInfo.findFirst.mockResolvedValue(malformedData);

      // Info: (20250604 - Shirley) 執行
      const result = await getUserPaymentInfoById(mockPaymentMethodId);

      // Info: (20250604 - Shirley) 驗證 - 應該能正常處理並返回結果
      expect(result).toBeDefined();
      expect(result?.detail).toBeNull();
    });
  });

  describe('信用卡資料驗證', () => {
    it('應該正確處理不同類型的信用卡', async () => {
      // Info: (20250604 - Shirley) 準備
      const visaCard: IPaymentMethod = {
        type: PAYMENT_METHOD_TYPE.VISA,
        number: '4111111111111111',
        expirationDate: '12/26',
        cvv: '123',
      };

      const paymentInfo: IPaymentInfo = {
        userId: mockUserId,
        token: 'visa-token',
        transactionId: 'visa-txn',
        default: true,
        detail: visaCard,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockPrisma.userPaymentInfo.create.mockResolvedValue({
        ...mockPrismaPaymentInfo,
        detail: visaCard as unknown as JsonValue,
      });

      // Info: (20250604 - Shirley) 執行
      const result = await createUserPaymentInfo(paymentInfo);

      // Info: (20250604 - Shirley) 驗證
      expect(result.detail.type).toBe(PAYMENT_METHOD_TYPE.VISA);
      expect(result.detail.number).toBe('4111111111111111');
    });

    it('應該正確處理其他類型的付費方式', async () => {
      // Info: (20250604 - Shirley) 準備
      const otherPayment: IPaymentMethod = {
        type: PAYMENT_METHOD_TYPE.OTHER,
        number: 'OTHER123',
        expirationDate: '01/30',
        cvv: '000',
      };

      const paymentInfo: IPaymentInfo = {
        userId: mockUserId,
        token: 'other-token',
        transactionId: 'other-txn',
        default: false,
        detail: otherPayment,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockPrisma.userPaymentInfo.create.mockResolvedValue({
        ...mockPrismaPaymentInfo,
        detail: otherPayment as unknown as JsonValue,
        default: false,
      });

      // Info: (20250604 - Shirley) 執行
      const result = await createUserPaymentInfo(paymentInfo);

      // Info: (20250604 - Shirley) 驗證
      expect(result.detail.type).toBe(PAYMENT_METHOD_TYPE.OTHER);
    });
  });
});
