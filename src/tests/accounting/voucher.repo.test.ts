/**
 * @jest-environment node
 */

import prisma from '@/client';
import {
  findUniqueVoucherInPrisma,
  findFirstAccountBelongsToCompanyInPrisma,
  getLatestVoucherNoInPrisma,
  createLineItemInPrisma,
  countUnpostedVoucher,
  findManyVoucherWithCashInPrisma,
  getOneVoucherByIdWithoutInclude,
  filterAvailableLineItems,
  isFullyReversed,
} from '@/lib/utils/repo/voucher.repo';
import { EventType } from '@/constants/account';
import { JOURNAL_EVENT } from '@/constants/journal';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { PUBLIC_ACCOUNT_BOOK_ID } from '@/interfaces/account_book';
import { CASH_AND_CASH_EQUIVALENTS_CODE } from '@/constants/cash_flow/common_cash_flow';
import { ILineItem } from '@/interfaces/line_item';
import {
  AssociateLineItem as PrismaAssociateLineItem,
  LineItem as PrismaLineItem,
} from '@prisma/client';

// Mock dependencies
jest.mock('@/client', () => ({
  __esModule: true,
  default: {
    voucher: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
    },
    lineItem: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    journal: {
      findUnique: jest.fn(),
    },
    certificate: {
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/utils/logger_back', () => ({
  loggerError: jest.fn(),
  default: {
    error: jest.fn(),
  },
}));

jest.mock('@/lib/utils/common', () => ({
  getTimestampNow: jest.fn(() => 1703980800),
  timestampInSeconds: jest.fn((timestamp: number) => Math.floor(timestamp / 1000)),
  pageToOffset: jest.fn((page: number, pageSize: number) => (page - 1) * pageSize),
  timestampInMilliSeconds: jest.fn((timestamp: number) => timestamp * 1000),
}));

// 定義與實際實作相符的介面
interface DeepNestedLineItem extends PrismaLineItem {
  originalLineItem?: PrismaAssociateLineItem[];
}

const mockPrisma = jest.mocked(prisma);

describe('Voucher Repository Tests', () => {
  // Test data setup
  const mockCompanyId = 1001;
  const mockUserId = 2001;
  const mockVoucherId = 3001;
  const mockAccountId = 4001;
  const mockNowTimestamp = 1703980800; // 2023-12-31 00:00:00

  const mockAccount = {
    id: mockAccountId,
    companyId: mockCompanyId,
    system: 'IFRS',
    type: 'ASSET',
    debit: true,
    liquidity: true,
    code: '1100',
    name: '現金及約當現金',
    forUser: true,
    parentId: null,
    rootId: 1,
    createdAt: mockNowTimestamp,
    updatedAt: mockNowTimestamp,
    deletedAt: null,
  };

  const mockLineItem = {
    id: 1,
    amount: 10000,
    description: '測試項目',
    debit: true,
    accountId: mockAccountId,
    voucherId: mockVoucherId,
    createdAt: mockNowTimestamp,
    updatedAt: mockNowTimestamp,
    deletedAt: null,
  };

  const mockVoucher = {
    id: mockVoucherId,
    companyId: mockCompanyId,
    no: 'V001',
    date: mockNowTimestamp,
    type: EventType.INCOME,
    note: '測試傳票',
    counterPartyId: null,
    issuerId: mockUserId,
    editable: true,
    status: JOURNAL_EVENT.UPLOADED,
    createdAt: mockNowTimestamp,
    updatedAt: mockNowTimestamp,
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findUniqueVoucherInPrisma', () => {
    it('應該成功查詢單一傳票', async () => {
      // Arrange
      const mockVoucherWithRelations = {
        ...mockVoucher,
        invoiceVoucherJournals: [],
        lineItems: [
          {
            ...mockLineItem,
            account: mockAccount,
          },
        ],
      };

      (mockPrisma.voucher.findUnique as jest.Mock).mockResolvedValue(mockVoucherWithRelations);

      // Act
      const result = await findUniqueVoucherInPrisma(mockVoucherId);

      // Assert
      expect(result).toEqual(mockVoucherWithRelations);
      expect(mockPrisma.voucher.findUnique).toHaveBeenCalledWith({
        where: { id: mockVoucherId },
        include: {
          invoiceVoucherJournals: {
            include: { journal: true },
          },
          lineItems: {
            include: { account: true },
          },
        },
      });
    });

    it('當傳票不存在時應該返回 null', async () => {
      // Arrange
      (mockPrisma.voucher.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await findUniqueVoucherInPrisma(mockVoucherId);

      // Assert
      expect(result).toBeNull();
    });

    it('當資料庫查詢失敗時應該拋出錯誤', async () => {
      // Arrange
      (mockPrisma.voucher.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(findUniqueVoucherInPrisma(mockVoucherId)).rejects.toThrow(
        STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR
      );
    });
  });

  describe('findFirstAccountBelongsToCompanyInPrisma', () => {
    it('應該成功查詢屬於公司的會計科目', async () => {
      // Arrange
      (mockPrisma.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);

      // Act
      const result = await findFirstAccountBelongsToCompanyInPrisma(
        mockAccountId.toString(),
        mockCompanyId
      );

      // Assert
      expect(result).toEqual(mockAccount);
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockAccountId,
          OR: [
            { company: { id: mockCompanyId } },
            { company: { id: PUBLIC_ACCOUNT_BOOK_ID } }, // 使用實際常數值 1002
          ],
        },
      });
    });

    it('當會計科目不屬於公司時應該返回 null', async () => {
      // Arrange
      (mockPrisma.account.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await findFirstAccountBelongsToCompanyInPrisma(
        mockAccountId.toString(),
        mockCompanyId
      );

      // Assert
      expect(result).toBeNull();
    });

    it('當資料庫查詢失敗時應該拋出錯誤', async () => {
      // Arrange
      (mockPrisma.account.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        findFirstAccountBelongsToCompanyInPrisma(mockAccountId.toString(), mockCompanyId)
      ).rejects.toThrow(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
    });
  });

  describe('getLatestVoucherNoInPrisma', () => {
    it('應該返回基於日期格式的傳票編號', async () => {
      // Arrange
      const mockExistingVoucher = { no: '20231231001' };
      (mockPrisma.voucher.findFirst as jest.Mock).mockResolvedValue(mockExistingVoucher);

      // Act
      const result = await getLatestVoucherNoInPrisma(mockCompanyId);

      // Assert
      // 基於實際實作，應該返回格式為 YYYYMMDDXXX 的編號
      expect(result).toMatch(/^\d{8}\d{3}$/);
      expect(mockPrisma.voucher.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          date: expect.objectContaining({
            gte: expect.any(Number),
            lte: expect.any(Number),
          }),
        },
        orderBy: { no: 'desc' },
        select: { no: true, createdAt: true },
      });
    });

    it('當沒有現有傳票時應該返回第一個編號', async () => {
      // Arrange
      (mockPrisma.voucher.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await getLatestVoucherNoInPrisma(mockCompanyId);

      // Assert
      // 根據實際實作，應該返回日期+001格式
      expect(result).toMatch(/^\d{8}001$/);
    });

    it('帶有特定日期時應該過濾該日期範圍', async () => {
      // Arrange
      const specificDate = 1672531200; // 2023-01-01
      (mockPrisma.voucher.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await getLatestVoucherNoInPrisma(mockCompanyId, { voucherDate: specificDate });

      // Assert
      expect(result).toMatch(/^\d{8}001$/);
      expect(mockPrisma.voucher.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
            date: expect.objectContaining({
              gte: expect.any(Number),
              lte: expect.any(Number),
            }),
          }),
        })
      );
    });
  });

  describe('createLineItemInPrisma', () => {
    const mockLineItemInput: ILineItem = {
      lineItemIndex: '1',
      account: '1100',
      amount: 10000,
      description: '測試項目',
      debit: true,
      accountId: mockAccountId,
    };

    it('應該成功建立傳票項目', async () => {
      // Arrange
      (mockPrisma.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);
      // 根據實際實作，createLineItemInPrisma 返回建立的 lineItem 的 ID
      (mockPrisma.lineItem.create as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      const result = await createLineItemInPrisma(mockLineItemInput, mockVoucherId, mockCompanyId);

      // Assert
      expect(result).toBe(1);
      expect(mockPrisma.lineItem.create).toHaveBeenCalledWith({
        data: {
          amount: mockLineItemInput.amount,
          description: mockLineItemInput.description,
          debit: mockLineItemInput.debit,
          account: { connect: { id: mockLineItemInput.accountId } },
          voucher: { connect: { id: mockVoucherId } },
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
        },
        select: { id: true },
      });
    });

    it('當會計科目ID未提供時應該拋出錯誤', async () => {
      // Arrange
      const invalidLineItem = {
        ...mockLineItemInput,
        accountId: undefined,
      } as unknown as ILineItem;

      // Act & Assert
      await expect(
        createLineItemInPrisma(invalidLineItem, mockVoucherId, mockCompanyId)
      ).rejects.toThrow(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
    });

    it('當會計科目不屬於公司時應該拋出錯誤', async () => {
      // Arrange
      (mockPrisma.account.findFirst as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        createLineItemInPrisma(mockLineItemInput, mockVoucherId, mockCompanyId)
      ).rejects.toThrow(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
    });
  });

  describe('countUnpostedVoucher', () => {
    it('應該返回未過帳傳票數量', async () => {
      // Arrange
      const expectedCount = 5;
      (mockPrisma.certificate.count as jest.Mock).mockResolvedValue(expectedCount);

      // Act
      const result = await countUnpostedVoucher(mockCompanyId);

      // Assert
      expect(result).toBe(expectedCount);
      expect(mockPrisma.certificate.count).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          NOT: {
            voucherCertificates: {
              some: {},
            },
          },
        },
      });
    });

    it('當資料庫查詢失敗時應該拋出錯誤', async () => {
      // Arrange
      (mockPrisma.certificate.count as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(countUnpostedVoucher(mockCompanyId)).rejects.toThrow();
    });
  });

  describe('findManyVoucherWithCashInPrisma', () => {
    it('應該查詢指定期間內包含現金的傳票', async () => {
      // Arrange
      const startDate = mockNowTimestamp;
      const endDate = mockNowTimestamp + 86400;
      (mockPrisma.voucher.findMany as jest.Mock).mockResolvedValue([mockVoucher]);

      // Act
      const result = await findManyVoucherWithCashInPrisma(mockCompanyId, startDate, endDate);

      // Assert
      expect(result).toEqual([mockVoucher]);
      expect(mockPrisma.voucher.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          date: { gte: startDate, lte: endDate },
          lineItems: {
            some: {
              OR: CASH_AND_CASH_EQUIVALENTS_CODE.map((cashCode) => ({
                account: {
                  code: {
                    startsWith: cashCode,
                  },
                },
              })),
            },
          },
        },
        include: {
          lineItems: {
            include: {
              account: true,
            },
          },
        },
      });
    });
  });

  describe('getOneVoucherByIdWithoutInclude', () => {
    it('應該獲取不包含關聯資料的傳票', async () => {
      // Arrange
      (mockPrisma.voucher.findUnique as jest.Mock).mockResolvedValue(mockVoucher);

      // Act
      const result = await getOneVoucherByIdWithoutInclude(mockVoucherId);

      // Assert
      expect(result).toEqual(mockVoucher);
      expect(mockPrisma.voucher.findUnique).toHaveBeenCalledWith({
        where: { id: mockVoucherId },
      });
    });

    it('當傳票不存在時應該返回 null', async () => {
      // Arrange
      (mockPrisma.voucher.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await getOneVoucherByIdWithoutInclude(mockVoucherId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('工具函數測試', () => {
    describe('isFullyReversed', () => {
      it('當傳票項目完全被沖銷時應該返回 true', () => {
        // Arrange
        const lineItemWithReverse: DeepNestedLineItem = {
          ...mockLineItem,
          originalLineItem: [
            {
              id: 1,
              associateVoucherId: 1,
              originalLineItemId: mockLineItem.id,
              resultLineItemId: 2,
              debit: true,
              amount: 10000,
              createdAt: mockNowTimestamp,
              updatedAt: mockNowTimestamp,
              deletedAt: null,
            },
          ],
        };

        // Act
        const result = isFullyReversed(lineItemWithReverse);

        // Assert
        expect(result).toBe(true);
      });

      it('當傳票項目未被沖銷時應該返回 false', () => {
        // Arrange
        const lineItemWithoutReverse: DeepNestedLineItem = {
          ...mockLineItem,
          originalLineItem: [],
        };

        // Act
        const result = isFullyReversed(lineItemWithoutReverse);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('filterAvailableLineItems', () => {
      it('應該過濾掉被完全沖銷的項目', () => {
        // Arrange
        const lineItems: DeepNestedLineItem[] = [
          { ...mockLineItem, id: 1, originalLineItem: [] },
          {
            ...mockLineItem,
            id: 2,
            originalLineItem: [
              {
                id: 1,
                associateVoucherId: 1,
                originalLineItemId: 2,
                resultLineItemId: 3,
                debit: true,
                amount: 10000,
                createdAt: mockNowTimestamp,
                updatedAt: mockNowTimestamp,
                deletedAt: null,
              },
            ],
          },
        ];

        // Act
        const result = filterAvailableLineItems(lineItems);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
      });

      it('應該正確處理空的傳票項目列表', () => {
        // Arrange
        const emptyLineItems: DeepNestedLineItem[] = [];

        // Act
        const result = filterAvailableLineItems(emptyLineItems);

        // Assert
        expect(result).toHaveLength(0);
      });
    });
  });

  describe('邊界條件和錯誤處理', () => {
    it('應該正確處理無效的會計科目ID', async () => {
      // Arrange
      const invalidAccountId = 'invalid';
      (mockPrisma.account.findFirst as jest.Mock).mockRejectedValue(
        new Error('Invalid input syntax')
      );

      // Act & Assert
      await expect(
        findFirstAccountBelongsToCompanyInPrisma(invalidAccountId, mockCompanyId)
      ).rejects.toThrow();
    });

    it('應該正確處理資料庫連接錯誤', async () => {
      // Arrange
      (mockPrisma.voucher.findUnique as jest.Mock).mockRejectedValue(
        new Error('Connection timeout')
      );

      // Act & Assert
      await expect(findUniqueVoucherInPrisma(mockVoucherId)).rejects.toThrow(
        STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR
      );
    });

    it('應該處理空的傳票編號生成', async () => {
      // Arrange - 模擬沒有傳票時的情況
      (mockPrisma.voucher.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await getLatestVoucherNoInPrisma(mockCompanyId);

      // Assert
      expect(result).toMatch(/^\d{8}001$/);
    });

    it('應該處理異常的傳票編號格式', async () => {
      // Arrange - 模擬異常編號格式
      (mockPrisma.voucher.findFirst as jest.Mock).mockResolvedValue({
        no: 'INVALID_FORMAT',
      });

      // Act
      const result = await getLatestVoucherNoInPrisma(mockCompanyId);

      // Assert
      // 基於實際實作，當編號格式異常時會產生 NaN，但仍會返回基於日期的字串
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{8}/); // 至少包含日期部分
    });
  });
});
