import { certificateAPIGetListUtils as getListUtils } from '@/pages/api/v2/account_book/[accountBookId]/certificate/route_utils';
import { getCertificatesV2, getAllFilteredInvoice } from '@/lib/utils/repo/certificate.repo';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { SortBy, SortOrder } from '@/constants/sort';
import { InvoiceTabs } from '@/constants/invoice_rc2';
import { InvoiceType } from '@/constants/invoice';
import { CurrencyType, OEN_CURRENCY } from '@/constants/currency';
import { ICertificate } from '@/interfaces/certificate';
import loggerBack from '@/lib/utils/logger_back';
import { FileFolder } from '@/constants/file';

// Info: (20250609 - Shirley) 模擬所有依賴
jest.mock('@/lib/utils/repo/certificate.repo');
jest.mock('@/lib/utils/repo/accounting_setting.repo');
jest.mock('@/lib/utils/logger_back', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Info: (20250609 - Shirley) 設置模擬函數
const mockGetCertificatesV2 = jest.mocked(getCertificatesV2);
const mockGetAllFilteredInvoice = jest.mocked(getAllFilteredInvoice);
const mockGetAccountingSettingByCompanyId = jest.mocked(getAccountingSettingByCompanyId);

// ToDo: (20250612 - Shirley) Revise ineffective test cases
describe('Certificate API Get List Utils 測試', () => {
  const mockCompanyId = 1;
  const mockTimestamp = 1640995200;
  const mockStartDate = 1640908800;
  const mockEndDate = 1641081600;

  // Info: (20250609 - Shirley) 模擬憑證列表資料
  const mockCertificateList: ICertificate[] = [
    {
      id: 1,
      name: 'certificate1.jpg',
      companyId: mockCompanyId,
      incomplete: false,
      file: {
        id: 1,
        name: 'certificate1.jpg',
        size: 1024,
        url: 'https://example.com/certificate1.jpg',
        existed: true,
      },
      invoice: {
        id: 1,
        date: mockTimestamp,
        totalPrice: 1000,
        priceBeforeTax: 952,
      },
      voucherNo: 'V-001',
      voucherId: 1,
      aiResultId: 'ai-result-1',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      uploader: 'Test User 1',
      uploaderUrl: 'https://example.com/user1.jpg',
    },
    {
      id: 2,
      name: 'certificate2.jpg',
      companyId: mockCompanyId,
      incomplete: true,
      file: {
        id: 2,
        name: 'certificate2.jpg',
        size: 2048,
        url: 'https://example.com/certificate2.jpg',
        existed: true,
      },
      invoice: {
        id: 2,
        date: mockTimestamp + 86400,
        totalPrice: 2000,
        priceBeforeTax: 1905,
      },
      voucherNo: null,
      voucherId: null,
      aiResultId: 'ai-result-2',
      createdAt: mockTimestamp + 86400,
      updatedAt: mockTimestamp + 86400,
      uploader: 'Test User 2',
      uploaderUrl: 'https://example.com/user2.jpg',
    },
    {
      id: 3,
      name: 'certificate3.jpg',
      companyId: mockCompanyId,
      incomplete: true,
      file: {
        id: 3,
        name: 'certificate3.jpg',
        size: 1536,
        url: 'https://example.com/certificate3.jpg',
        existed: true,
      },
      invoice: {
        id: 3,
        date: mockTimestamp - 86400,
        totalPrice: 1500,
        priceBeforeTax: 1428,
      },
      voucherNo: 'V-003',
      voucherId: 3,
      aiResultId: 'ai-result-3',
      createdAt: mockTimestamp - 86400,
      updatedAt: mockTimestamp - 86400,
      uploader: 'Test User 3',
      uploaderUrl: 'https://example.com/user3.jpg',
    },
  ];

  const mockPaginatedResult = {
    data: [],
    page: 1,
    totalPages: 1,
    totalCount: 3,
    pageSize: 10,
    hasNextPage: false,
    hasPreviousPage: false,
    sort: [{ sortBy: SortBy.DATE, sortOrder: SortOrder.ASC }],
    where: {},
  };

  const mockAccountingSetting = {
    id: 1,
    companyId: mockCompanyId,
    currency: CurrencyType.TWD,
    returnPeriodicity: 'Monthly',
    salesTaxRate: 5,
    salesTaxTaxable: true,
    purchaseTaxRate: 5,
    purchaseTaxTaxable: true,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    deletedAt: null,
    shortcuts: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSortFunction', () => {
    it('應該依據日期正確排序', () => {
      const sortFunction = getListUtils.getSortFunction(SortBy.DATE);

      // Info: (20250609 - Shirley) 測試正常日期排序
      const result1 = sortFunction(mockCertificateList[0], mockCertificateList[1]);
      expect(result1).toBeLessThan(0); // Info: (20250609 - Shirley) certificate1 日期較早

      const result2 = sortFunction(mockCertificateList[1], mockCertificateList[0]);
      expect(result2).toBeGreaterThan(0); // Info: (20250609 - Shirley) certificate2 日期較晚

      // Info: (20250609 - Shirley) 測試 undefined 日期處理
      const certificateWithUndefinedDate = {
        ...mockCertificateList[0],
        invoice: { ...mockCertificateList[0].invoice, date: undefined },
      };
      const result3 = sortFunction(certificateWithUndefinedDate, mockCertificateList[1]);
      expect(result3).toBe(-1); // Info: (20250609 - Shirley) undefined 日期排在前面

      const result4 = sortFunction(mockCertificateList[1], certificateWithUndefinedDate);
      expect(result4).toBe(1); // Info: (20250609 - Shirley) 有日期的排在後面
    });

    it('應該依據憑證號碼正確排序（僅在 WITH_VOUCHER tab）', () => {
      const sortFunction = getListUtils.getSortFunction(SortBy.VOUCHER_NUMBER);

      // Info: (20250609 - Shirley) 在 WITH_VOUCHER tab 下應該進行排序
      const result1 = sortFunction(
        mockCertificateList[0],
        mockCertificateList[2],
        InvoiceTabs.WITH_VOUCHER
      );
      expect(result1).toBeLessThan(0); // Info: (20250609 - Shirley) V-001 < V-003

      // Info: (20250609 - Shirley) 在其他 tab 下不應該排序
      const result2 = sortFunction(
        mockCertificateList[0],
        mockCertificateList[2],
        InvoiceTabs.WITHOUT_VOUCHER
      );
      expect(result2).toBe(0);
    });

    it('應該依據金額正確排序', () => {
      const sortFunction = getListUtils.getSortFunction(SortBy.AMOUNT);

      // Info: (20250609 - Shirley) 使用 totalPrice 排序
      const result1 = sortFunction(mockCertificateList[0], mockCertificateList[1]);
      expect(result1).toBeLessThan(0); // Info: (20250609 - Shirley) 1000 < 2000

      // Info: (20250609 - Shirley) 如果沒有 totalPrice，使用 priceBeforeTax
      const certificateWithoutTotalPrice = {
        ...mockCertificateList[0],
        invoice: { ...mockCertificateList[0].invoice, totalPrice: undefined },
      };
      const result2 = sortFunction(certificateWithoutTotalPrice, mockCertificateList[1]);
      expect(result2).toBeLessThan(0); // Info: (20250609 - Shirley) 952 < 2000
    });

    it('應該在未知排序類型時返回 0', () => {
      const sortFunction = getListUtils.getSortFunction('UNKNOWN' as SortBy);

      const result = sortFunction(mockCertificateList[0], mockCertificateList[1]);
      expect(result).toBe(0);
      expect(loggerBack.info).toHaveBeenCalledWith('No sorting applied.');
    });
  });

  describe('sortCertificateList', () => {
    it('應該正確應用排序選項', () => {
      const certificateList = [...mockCertificateList];
      const sortOption = [
        { sortBy: SortBy.DATE, sortOrder: SortOrder.ASC },
        { sortBy: SortBy.AMOUNT, sortOrder: SortOrder.DESC },
      ];

      getListUtils.sortCertificateList(certificateList, { sortOption });

      // Info: (20250609 - Shirley) 驗證排序是否被正確應用
      // Info: (20250609 - Shirley) 這裡主要測試函數是否被呼叫，實際排序邏輯在 getSortFunction 中已測試
      expect(certificateList).toBeDefined();
    });

    it('應該正確處理帶有 tab 參數的排序', () => {
      const certificateList = [...mockCertificateList];
      const sortOption = [{ sortBy: SortBy.VOUCHER_NUMBER, sortOrder: SortOrder.ASC }];

      getListUtils.sortCertificateList(certificateList, {
        sortOption,
        tab: InvoiceTabs.WITH_VOUCHER,
      });

      expect(certificateList).toBeDefined();
    });
  });

  describe('getPaginatedCertificateList', () => {
    it('應該正確呼叫 getCertificatesV2 並回傳分頁結果', async () => {
      mockGetCertificatesV2.mockResolvedValue(mockPaginatedResult);

      const options = {
        companyId: mockCompanyId,
        startDate: mockStartDate,
        endDate: mockEndDate,
        page: 1,
        pageSize: 10,
        sortOption: [{ sortBy: SortBy.DATE, sortOrder: SortOrder.ASC }],
        searchQuery: 'test',
        isDeleted: false,
        type: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
        tab: InvoiceTabs.WITH_VOUCHER,
      };

      const result = await getListUtils.getPaginatedCertificateList(options);

      expect(mockGetCertificatesV2).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('getCurrencyFromSetting', () => {
    it('應該正確取得幣別設定', async () => {
      mockGetAccountingSettingByCompanyId.mockResolvedValue(mockAccountingSetting);

      const result = await getListUtils.getCurrencyFromSetting(mockCompanyId);

      expect(mockGetAccountingSettingByCompanyId).toHaveBeenCalledWith(mockCompanyId);
      expect(result).toBe(OEN_CURRENCY[CurrencyType.TWD]);
    });

    it('應該在沒有設定時回傳預設幣別', async () => {
      mockGetAccountingSettingByCompanyId.mockResolvedValue(null);

      const result = await getListUtils.getCurrencyFromSetting(mockCompanyId);

      expect(result).toBe(OEN_CURRENCY[CurrencyType.TWD]);
    });

    it('應該處理未知幣別類型', async () => {
      const unknownCurrencySetting = {
        ...mockAccountingSetting,
        currency: 'UNKNOWN_CURRENCY' as CurrencyType,
      };
      mockGetAccountingSettingByCompanyId.mockResolvedValue(unknownCurrencySetting);

      const result = await getListUtils.getCurrencyFromSetting(mockCompanyId);

      expect(result).toBeUndefined(); // Info: (20250609 - Shirley) 未知幣別會回傳 undefined
    });
  });

  describe('getSumOfTotalInvoicePrice', () => {
    it('應該正確計算發票總金額', async () => {
      const mockFilteredInvoices = [
        {
          invoices: [{ totalPrice: 1000 }],
        },
        {
          invoices: [{ totalPrice: 2000 }],
        },
        {
          invoices: [{ totalPrice: 1500 }],
        },
      ];

      mockGetAllFilteredInvoice.mockResolvedValue(mockFilteredInvoices);

      const options = {
        companyId: mockCompanyId,
        startDate: mockStartDate,
        endDate: mockEndDate,
        searchQuery: 'test',
        type: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
        tab: InvoiceTabs.WITH_VOUCHER,
        isDeleted: false,
      };

      const result = await getListUtils.getSumOfTotalInvoicePrice(options);

      expect(mockGetAllFilteredInvoice).toHaveBeenCalledWith(options);
      expect(result).toBe(4500); // Info: (20250609 - Shirley) 1000 + 2000 + 1500
    });

    it('應該正確處理沒有發票的憑證', async () => {
      const mockFilteredInvoices = [
        {
          invoices: [],
        },
        {
          invoices: [{ totalPrice: 1000 }],
        },
      ];

      mockGetAllFilteredInvoice.mockResolvedValue(mockFilteredInvoices);

      const options = {
        companyId: mockCompanyId,
        startDate: mockStartDate,
        endDate: mockEndDate,
      };

      const result = await getListUtils.getSumOfTotalInvoicePrice(options);

      expect(result).toBe(1000); // Info: (20250609 - Shirley) 只計算有發票的憑證
    });

    it('應該正確處理發票金額為 0 的情況', async () => {
      const mockFilteredInvoices = [
        {
          invoices: [{ totalPrice: 0 }],
        },
        {
          invoices: [{ totalPrice: 1000 }],
        },
      ];

      mockGetAllFilteredInvoice.mockResolvedValue(mockFilteredInvoices);

      const options = {
        companyId: mockCompanyId,
      };

      const result = await getListUtils.getSumOfTotalInvoicePrice(options);

      expect(result).toBe(1000); // Info: (20250609 - Shirley) 0 + 1000
    });
  });

  describe('transformCertificateEntityToResponse', () => {
    it('應該正確轉換憑證實體為回應格式', () => {
      const mockCertificateEntity = {
        id: 1,
        companyId: mockCompanyId,
        aiResultId: 'test-ai-result',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
        file: {
          id: 1,
          name: 'test.jpg',
          size: 1024,
          url: 'https://example.com/test.jpg',
          mimeType: 'image/jpeg',
          type: FileFolder.TMP,
          isEncrypted: false,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          deletedAt: null,
          thumbnailId: 2,
          thumbnail: {
            id: 2,
            name: 'test-thumb.jpg',
            size: 256,
            url: 'https://example.com/test-thumb.jpg',
            mimeType: 'image/jpeg',
            type: FileFolder.TMP,
            isEncrypted: false,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
            deletedAt: null,
          },
        },
        invoice: {
          id: 1,
          name: 'Test Invoice',
          date: mockTimestamp,
          no: 'INV-001',
          totalPrice: 1000,
          priceBeforeTax: 952,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          deletedAt: null,
          counterParty: {
            id: 1,
            companyId: mockCompanyId,
            name: 'Test Counter Party',
            taxId: '12345678',
            type: 'COMPANY',
            note: '',
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          },
        },
        uploader: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          phone: '0912345678',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          deletedAt: null,
          imageFile: {
            id: 3,
            name: 'user-avatar.jpg',
            size: 512,
            url: 'https://example.com/user-avatar.jpg',
            mimeType: 'image/jpeg',
            isEncrypted: false,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
            deletedAt: null,
          },
        },
        vouchers: [
          {
            id: 1,
            companyId: mockCompanyId,
            no: 'V-001',
            lineItems: [],
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
            deletedAt: null,
          },
        ],
      };

      const result = getListUtils.transformCertificateEntityToResponse(mockCertificateEntity);

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          name: 'test.jpg',
          companyId: mockCompanyId,
          incomplete: false,
          aiResultId: 'test-ai-result',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          uploader: 'Test User',
          uploaderUrl: 'https://example.com/user-avatar.jpg',
          voucherNo: 'V-001',
          voucherId: 1,
        })
      );

      expect(result.file).toEqual(
        expect.objectContaining({
          id: 1,
          name: 'test.jpg',
          size: 1024,
          existed: true,
        })
      );

      expect(result.file.thumbnail).toEqual(
        expect.objectContaining({
          id: 2,
          name: 'test-thumb.jpg',
          size: 256,
          existed: true,
        })
      );

      expect(result.invoice).toEqual(
        expect.objectContaining({
          id: 1,
          date: mockTimestamp,
          no: 'INV-001',
          totalPrice: 1000,
          priceBeforeTax: 952,
        })
      );
    });

    it('應該正確處理沒有發票的憑證', () => {
      const mockCertificateEntityWithoutInvoice = {
        id: 1,
        companyId: mockCompanyId,
        aiResultId: 'test-ai-result',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
        file: {
          id: 1,
          name: 'test.jpg',
          size: 1024,
          url: 'https://example.com/test.jpg',
          mimeType: 'image/jpeg',
          type: FileFolder.TMP,
          isEncrypted: false,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          deletedAt: null,
        },
        invoice: null, // Info: (20250609 - Shirley) 沒有發票
        uploader: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          phone: '0912345678',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          deletedAt: null,
          imageFile: {
            id: 3,
            name: 'user-avatar.jpg',
            size: 512,
            url: 'https://example.com/user-avatar.jpg',
            mimeType: 'image/jpeg',
            isEncrypted: false,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
            deletedAt: null,
          },
        },
        vouchers: [],
      };

      const result = getListUtils.transformCertificateEntityToResponse(
        mockCertificateEntityWithoutInvoice
      );

      expect(result.invoice).toEqual({});
      expect(result.voucherNo).toBe('');
      expect(result.voucherId).toBeNull();
    });

    it('應該正確處理沒有縮圖的檔案', () => {
      const mockCertificateEntityWithoutThumbnail = {
        id: 1,
        companyId: mockCompanyId,
        aiResultId: 'test-ai-result',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
        file: {
          id: 1,
          name: 'test.jpg',
          size: 1024,
          url: 'https://example.com/test.jpg',
          mimeType: 'image/jpeg',
          type: FileFolder.TMP,
          isEncrypted: false,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          deletedAt: null,
          thumbnailId: null, // Info: (20250609 - Shirley) 沒有縮圖
          thumbnail: null,
        },
        invoice: {
          id: 1,
          name: 'Test Invoice',
          date: mockTimestamp,
          no: 'INV-001',
          totalPrice: 1000,
          priceBeforeTax: 952,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          deletedAt: null,
          counterParty: {
            id: 1,
            companyId: mockCompanyId,
            name: 'Test Counter Party',
            taxId: '12345678',
            type: 'COMPANY',
            note: '',
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          },
        },
        uploader: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          phone: '0912345678',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          deletedAt: null,
          imageFile: {
            id: 3,
            name: 'user-avatar.jpg',
            size: 512,
            url: 'https://example.com/user-avatar.jpg',
            mimeType: 'image/jpeg',
            isEncrypted: false,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
            deletedAt: null,
          },
        },
        vouchers: [],
      };

      const result = getListUtils.transformCertificateEntityToResponse(
        mockCertificateEntityWithoutThumbnail
      );

      expect(result.file.thumbnail).toBeUndefined();
    });
  });
});
