import prisma from '@/client';
import {
  createCertificateWithEmptyInvoice,
  getOneCertificateById,
  getCertificatesV2,
  deleteMultipleCertificates,
  getAllFilteredInvoice,
  transformWithIncomplete,
  summarizeIncompleteCertificates,
  mapCertificateWithIncomplete,
  countMissingCertificate,
} from '@/lib/utils/repo/certificate.repo';
import { getTimestampNow } from '@/lib/utils/common';
import { InvoiceType } from '@/constants/invoice';
import { SortBy, SortOrder } from '@/constants/sort';
import { InvoiceTabs } from '@/constants/invoice_rc2';
import { ICertificate } from '@/interfaces/certificate';

// Info: (20250609 - Shirley) 模擬 Prisma client
jest.mock('@/client', () => ({
  __esModule: true,
  default: {
    certificate: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    voucher: {
      count: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    voucherCertificate: {
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    invoice: {
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Info: (20250609 - Shirley) 模擬其他依賴
jest.mock('@/lib/utils/common');
jest.mock('@/lib/utils/logger_back', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Info: (20250609 - Shirley) 設置模擬函數
const mockPrisma = jest.mocked(prisma);
const mockGetTimestampNow = jest.mocked(getTimestampNow);

describe('Certificate Repo 測試', () => {
  const mockTimestamp = 1640995200;
  const mockCompanyId = 1;
  const mockUploaderId = 1;
  const mockFileId = 1;
  const mockCertificateId = 1;

  const mockCertificateData = {
    id: mockCertificateId,
    companyId: mockCompanyId,
    uploaderId: mockUploaderId,
    fileId: mockFileId,
    aiResultId: 'test-ai-result',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    deletedAt: null,
    file: {
      id: mockFileId,
      name: 'test-certificate.jpg',
      size: 1024,
      url: 'https://example.com/test-certificate.jpg',
      mimeType: 'image/jpeg',
      type: 'TMP',
      isEncrypted: false,
      encryptedSymmetricKey: '',
      iv: Buffer.from(''),
      thumbnailId: null,
      thumbnail: null,
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      deletedAt: null,
    },
    voucherCertificates: [],
    invoices: [],
    uploader: {
      id: mockUploaderId,
      name: 'Test User',
      email: 'test@example.com',
      phone: '0912345678',
      imageFileId: 2,
      imageFile: {
        id: 2,
        name: 'user-avatar.jpg',
        size: 512,
        url: 'https://example.com/user-avatar.jpg',
        mimeType: 'image/jpeg',
        type: 'TMP',
        isEncrypted: false,
        encryptedSymmetricKey: '',
        iv: Buffer.from(''),
        thumbnailId: null,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
      },
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      deletedAt: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTimestampNow.mockReturnValue(mockTimestamp);
  });

  describe('createCertificateWithEmptyInvoice', () => {
    it('應該成功創建憑證', async () => {
      (mockPrisma.certificate.create as jest.Mock).mockResolvedValue(mockCertificateData);

      const options = {
        nowInSecond: mockTimestamp,
        companyId: mockCompanyId,
        uploaderId: mockUploaderId,
        fileId: mockFileId,
        aiResultId: 'test-ai-result',
      };

      const result = await createCertificateWithEmptyInvoice(options);

      expect(mockPrisma.certificate.create).toHaveBeenCalledWith({
        data: {
          company: { connect: { id: mockCompanyId } },
          uploader: { connect: { id: mockUploaderId } },
          file: { connect: { id: mockFileId } },
          aiResultId: 'test-ai-result',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          deletedAt: null,
        },
        include: {
          voucherCertificates: {
            include: { voucher: true },
          },
          file: {
            include: { thumbnail: true },
          },
          invoices: true,
          uploader: {
            include: { imageFile: true },
          },
        },
      });
      expect(result).toEqual(mockCertificateData);
    });

    it('應該在創建失敗時回傳 null', async () => {
      const error = new Error('Database error');
      (mockPrisma.certificate.create as jest.Mock).mockRejectedValue(error);

      const options = {
        nowInSecond: mockTimestamp,
        companyId: mockCompanyId,
        uploaderId: mockUploaderId,
        fileId: mockFileId,
      };

      const result = await createCertificateWithEmptyInvoice(options);

      expect(result).toBeNull();
    });

    it('應該處理沒有 aiResultId 的情況', async () => {
      (mockPrisma.certificate.create as jest.Mock).mockResolvedValue(mockCertificateData);

      const options = {
        nowInSecond: mockTimestamp,
        companyId: mockCompanyId,
        uploaderId: mockUploaderId,
        fileId: mockFileId,
      };

      await createCertificateWithEmptyInvoice(options);

      expect(mockPrisma.certificate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiResultId: undefined,
          }),
        })
      );
    });
  });

  describe('getOneCertificateById', () => {
    it('應該成功取得憑證', async () => {
      (mockPrisma.certificate.findUnique as jest.Mock).mockResolvedValue(mockCertificateData);

      const result = await getOneCertificateById(mockCertificateId);

      expect(mockPrisma.certificate.findUnique).toHaveBeenCalledWith({
        where: {
          id: mockCertificateId,
          deletedAt: undefined,
        },
        include: {
          voucherCertificates: {
            include: { voucher: true },
          },
          file: {
            include: { thumbnail: true },
          },
          invoices: true,
          uploader: {
            include: { imageFile: true },
          },
        },
      });
      expect(result).toEqual(mockCertificateData);
    });

    it('應該能夠查詢已刪除的憑證', async () => {
      const deletedCertificate = {
        ...mockCertificateData,
        deletedAt: mockTimestamp,
      };
      (mockPrisma.certificate.findUnique as jest.Mock).mockResolvedValue(deletedCertificate);

      const result = await getOneCertificateById(mockCertificateId, { isDeleted: true });

      expect(mockPrisma.certificate.findUnique).toHaveBeenCalledWith({
        where: {
          id: mockCertificateId,
          deletedAt: { not: null },
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(deletedCertificate);
    });

    it('應該在憑證不存在時回傳 null', async () => {
      (mockPrisma.certificate.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getOneCertificateById(999);

      expect(result).toBeNull();
    });
  });

  describe('getCertificatesV2', () => {
    const mockOptions = {
      companyId: mockCompanyId,
      page: 1,
      pageSize: 10,
      sortOption: [{ sortBy: SortBy.DATE, sortOrder: SortOrder.ASC }],
      startDate: 1640908800,
      endDate: 1641081600,
      searchQuery: 'test',
      type: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
      tab: InvoiceTabs.WITH_VOUCHER,
      isDeleted: false,
    };

    it('應該成功取得分頁憑證列表', async () => {
      (mockPrisma.certificate.findMany as jest.Mock).mockResolvedValue([mockCertificateData]);
      (mockPrisma.certificate.count as jest.Mock).mockResolvedValue(1);

      const result = await getCertificatesV2(mockOptions);

      expect(mockPrisma.certificate.findMany).toHaveBeenCalled();
      expect(mockPrisma.certificate.count).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          page: 1,
          totalCount: 1,
          pageSize: 10,
        })
      );
    });

    it('應該正確處理排序選項', async () => {
      const sortOptions = [
        { sortBy: SortBy.DATE, sortOrder: SortOrder.DESC },
        { sortBy: SortBy.AMOUNT, sortOrder: SortOrder.ASC },
      ];

      (mockPrisma.certificate.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.certificate.count as jest.Mock).mockResolvedValue(0);

      await getCertificatesV2({
        ...mockOptions,
        sortOption: sortOptions,
      });

      expect(mockPrisma.certificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.any(Array),
        })
      );
    });

    it('應該正確處理搜尋查詢', async () => {
      (mockPrisma.certificate.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.certificate.count as jest.Mock).mockResolvedValue(0);

      await getCertificatesV2({
        ...mockOptions,
        searchQuery: 'invoice-123',
      });

      expect(mockPrisma.certificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.any(Array),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('deleteMultipleCertificates', () => {
    it('應該成功刪除多個憑證', async () => {
      const certificateIds = [1, 2, 3];

      // Info: (20250609 - Shirley) 正確模擬transaction，確保返回正確的值
      (mockPrisma.$transaction as jest.Mock).mockImplementation((operations) => {
        if (typeof operations === 'function') {
          // Info: (20250609 - Shirley) 模擬 transaction callback 執行
          return operations(mockPrisma);
        }
        // Info: (20250609 - Shirley) 模擬 array operations 的執行結果
        const mockResults = [
          // Info: (20250609 - Shirley) 第一個操作：prisma.certificate.findMany 的結果
          certificateIds.map((id) => ({ id })),
          // Info: (20250609 - Shirley) 其他操作的結果
          undefined,
          undefined,
          undefined,
        ];
        return mockResults;
      });

      const result = await deleteMultipleCertificates({
        certificateIds,
        nowInSecond: mockTimestamp,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(certificateIds);
    });

    it('應該正確處理空的憑證 ID 列表', async () => {
      // Info: (20250609 - Shirley) 對於空陣列，transaction 會返回空的查詢結果
      (mockPrisma.$transaction as jest.Mock).mockImplementation(() => {
        const mockResults = [
          [], // Info: (20250609 - Shirley) findMany 返回空陣列
          undefined,
          undefined,
          undefined,
        ];
        return mockResults;
      });

      const result = await deleteMultipleCertificates({
        certificateIds: [],
        nowInSecond: mockTimestamp,
      });

      expect(result).toEqual([]);
    });

    it('應該在交易失敗時拋出錯誤', async () => {
      const certificateIds = [1, 2, 3];
      const error = new Error('Transaction failed');
      (mockPrisma.$transaction as jest.Mock).mockRejectedValue(error);

      await expect(
        deleteMultipleCertificates({
          certificateIds,
          nowInSecond: mockTimestamp,
        })
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('getAllFilteredInvoice', () => {
    it('應該成功取得過濾後的發票列表', async () => {
      const mockInvoiceData = [
        {
          id: 1,
          invoices: [{ totalPrice: 1000 }],
        },
        {
          id: 2,
          invoices: [{ totalPrice: 2000 }],
        },
      ];

      (mockPrisma.certificate.findMany as jest.Mock).mockResolvedValue(mockInvoiceData);

      const options = {
        companyId: mockCompanyId,
        startDate: 1640908800,
        endDate: 1641081600,
        searchQuery: 'test',
        type: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
        tab: InvoiceTabs.WITH_VOUCHER,
        isDeleted: false,
      };

      const result = await getAllFilteredInvoice(options);

      expect(mockPrisma.certificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
            deletedAt: null,
          }),
          select: expect.objectContaining({
            invoices: expect.objectContaining({
              select: expect.objectContaining({
                totalPrice: true,
              }),
            }),
          }),
        })
      );
      expect(result).toEqual(mockInvoiceData);
    });

    it('應該正確處理不同的 tab 選項', async () => {
      (mockPrisma.certificate.findMany as jest.Mock).mockResolvedValue([]);

      await getAllFilteredInvoice({
        companyId: mockCompanyId,
        tab: InvoiceTabs.WITH_VOUCHER,
      });

      expect(mockPrisma.certificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({
                    voucherCertificates: expect.objectContaining({
                      some: expect.objectContaining({
                        deletedAt: null,
                      }),
                    }),
                  }),
                ]),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('countMissingCertificate', () => {
    it('應該正確計算缺少憑證的傳票數量', async () => {
      (mockPrisma.voucher.count as jest.Mock).mockResolvedValue(5);

      const result = await countMissingCertificate(mockCompanyId);

      expect(mockPrisma.voucher.count).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          NOT: {
            voucherCertificates: {
              some: {},
            },
          },
        },
      });
      expect(result).toBe(5);
    });
  });

  describe('transformWithIncomplete', () => {
    it('應該正確轉換憑證列表並添加 incomplete 屬性', () => {
      const mockCertificates: ICertificate[] = [
        {
          id: 1,
          name: 'cert1.jpg',
          companyId: mockCompanyId,
          incomplete: false,
          file: { id: 1, name: 'cert1.jpg', size: 1024, url: 'url1', existed: true },
          invoice: {},
          voucherNo: 'V-001',
          voucherId: 1,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          uploader: 'User 1',
          uploaderUrl: 'user1.jpg',
        },
      ];

      const result = transformWithIncomplete(mockCertificates);

      expect(result).toHaveLength(1);
      expect(result[0].incomplete).toBe(true); // Info: (20250609 - Shirley) transformWithIncomplete 會將所有憑證標記為 incomplete
    });
  });

  describe('summarizeIncompleteCertificates', () => {
    it('應該正確統計未完成憑證的摘要', () => {
      const mockCertificates: ICertificate[] = [
        {
          id: 1,
          name: 'cert1.jpg',
          companyId: mockCompanyId,
          incomplete: true,
          file: { id: 1, name: 'cert1.jpg', size: 1024, url: 'url1', existed: true },
          invoice: {},
          voucherNo: 'V-001',
          voucherId: 1, // Info: (20250609 - Shirley) 有 voucher
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          uploader: 'User 1',
          uploaderUrl: 'user1.jpg',
        },
        {
          id: 2,
          name: 'cert2.jpg',
          companyId: mockCompanyId,
          incomplete: true,
          file: { id: 2, name: 'cert2.jpg', size: 1024, url: 'url2', existed: true },
          invoice: {},
          voucherNo: null,
          voucherId: null, // Info: (20250609 - Shirley) 沒有 voucher
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          uploader: 'User 2',
          uploaderUrl: 'user2.jpg',
        },
        {
          id: 3,
          name: 'cert3.jpg',
          companyId: mockCompanyId,
          incomplete: false, // Info: (20250609 - Shirley) 已完成
          file: { id: 3, name: 'cert3.jpg', size: 1024, url: 'url3', existed: true },
          invoice: {},
          voucherNo: 'V-003',
          voucherId: 3,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          uploader: 'User 3',
          uploaderUrl: 'user3.jpg',
        },
      ];

      const result = summarizeIncompleteCertificates(mockCertificates);

      expect(result).toEqual({
        withVoucher: 1, // Info: (20250609 - Shirley) 只有第一個憑證是未完成且有 voucher
        withoutVoucher: 1, // Info: (20250609 - Shirley) 只有第二個憑證是未完成且沒有 voucher
      });
    });

    it('應該正確處理空的憑證列表', () => {
      const result = summarizeIncompleteCertificates([]);

      expect(result).toEqual({
        withVoucher: 0,
        withoutVoucher: 0,
      });
    });
  });

  describe('mapCertificateWithIncomplete', () => {
    it('應該正確為憑證添加 incomplete 屬性', () => {
      const mockCertificate: ICertificate = {
        id: 1,
        name: 'cert1.jpg',
        companyId: mockCompanyId,
        incomplete: false,
        file: { id: 1, name: 'cert1.jpg', size: 1024, url: 'url1', existed: true },
        invoice: {},
        voucherNo: 'V-001',
        voucherId: 1,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        uploader: 'User 1',
        uploaderUrl: 'user1.jpg',
      };

      const result = mapCertificateWithIncomplete(mockCertificate);

      expect(result).toEqual({
        ...mockCertificate,
        incomplete: true,
      });
    });
  });
});
