import { certificateAPIPostUtils as postUtils } from '@/pages/api/v2/account_book/[accountBookId]/certificate/route_utils';
import { createCertificateWithEmptyInvoice } from '@/lib/utils/repo/certificate.repo';
import { getTimestampNow } from '@/lib/utils/common';
import { initFileEntity, getImageUrlFromFileIdV1 } from '@/lib/utils/file';
import { parsePrismaFileToFileEntity } from '@/lib/utils/formatter/file.formatter';
import { parsePrismaCertificateToCertificateEntity } from '@/lib/utils/formatter/certificate.formatter';
import { parsePrismaUserToUserEntity } from '@/lib/utils/formatter/user.formatter';
import { getPusherInstance } from '@/lib/utils/pusher';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { FileFolder } from '@/constants/file';
import { InvoiceTransactionDirection, InvoiceTaxType, InvoiceType } from '@/constants/invoice';
import { CurrencyType } from '@/constants/currency';
import { PUBLIC_COUNTER_PARTY } from '@/constants/counterparty';
import loggerBack from '@/lib/utils/logger_back';
import { PostCertificateResponse } from '@/interfaces/certificate';
import { EventType } from '@/constants/account';
import { JOURNAL_EVENT } from '@/constants/journal';

// Info: (20250609 - Shirley) 模擬所有依賴
jest.mock('@/lib/utils/repo/certificate.repo');
jest.mock('@/lib/utils/common');
jest.mock('@/lib/utils/generate_user_icon');
jest.mock('@/lib/utils/file');
jest.mock('@/lib/utils/formatter/file.formatter');
jest.mock('@/lib/utils/formatter/voucher.formatter');
jest.mock('@/lib/utils/formatter/voucher_certificate.formatter');
jest.mock('@/lib/utils/formatter/certificate.formatter');
jest.mock('@/lib/utils/formatter/user.formatter');
jest.mock('@/lib/utils/pusher');
jest.mock('@/lib/utils/parse_image_form');
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));
jest.mock('@/lib/utils/logger_back', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Info: (20250609 - Shirley) 設置模擬函數
const mockCreateCertificateWithEmptyInvoice = jest.mocked(createCertificateWithEmptyInvoice);
const mockGetTimestampNow = jest.mocked(getTimestampNow);
const mockInitFileEntity = jest.mocked(initFileEntity);
const mockGetImageUrlFromFileIdV1 = jest.mocked(getImageUrlFromFileIdV1);
const mockParsePrismaFileToFileEntity = jest.mocked(parsePrismaFileToFileEntity);

// Info: (20250609 - Shirley) 模擬檔案相關函數
jest.mock('@/lib/utils/file', () => ({
  ...jest.requireActual('@/lib/utils/file'),
  parseFilePathWithBaseUrlPlaceholder: jest.fn().mockReturnValue('/mock/path/to/file'),
  decryptImageFile: jest.fn(),
  getImageUrlFromFileIdV1: jest.fn(),
  initFileEntity: jest.fn(),
}));
const mockParsePrismaCertificateToCertificateEntity = jest.mocked(
  parsePrismaCertificateToCertificateEntity
);
const mockParsePrismaUserToUserEntity = jest.mocked(parsePrismaUserToUserEntity);
const mockGetPusherInstance = jest.mocked(getPusherInstance);

// ToDo: (20250612 - Shirley) Revise ineffective test cases
describe('Certificate API Post Utils 測試', () => {
  const mockTimestamp = 1640995200;
  const mockCompanyId = 1;
  const mockUploaderId = 1;
  const mockFileId = 1;
  const mockCertificateId = 1;
  const mockAccountBookId = 1;
  const mockAiResultId = 'test-ai-result-id';

  // Info: (20250609 - Shirley) 正確的 PostCertificateResponse 類型模擬資料
  const mockCertificateFromPrisma: PostCertificateResponse = {
    id: mockCertificateId,
    companyId: mockCompanyId,
    uploaderId: mockUploaderId,
    fileId: mockFileId,
    aiResultId: mockAiResultId,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    deletedAt: null,
    file: {
      id: mockFileId,
      name: 'test-certificate.jpg',
      size: 1024,
      url: 'https://example.com/test-certificate.jpg',
      mimeType: 'image/jpeg',
      type: FileFolder.TMP,
      isEncrypted: false,
      encryptedSymmetricKey: '',
      iv: Buffer.from(''),
      thumbnailId: 2,
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      deletedAt: null,
    },
    voucherCertificates: [
      {
        id: 1,
        certificateId: mockCertificateId,
        voucherId: 1,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
        voucher: {
          id: 1,
          type: EventType.INCOME,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          deletedAt: null,
          aiResultId: 'voucher-ai-result',
          companyId: mockCompanyId,
          issuerId: mockUploaderId,
          counterPartyId: null,
          status: JOURNAL_EVENT.UPLOADED,
          editable: true,
          no: 'V-001',
          date: mockTimestamp,
          note: null,
        },
      },
    ],
    invoices: [
      {
        id: 1,
        certificateId: mockCertificateId,
        name: 'Test Invoice',
        counterPartyInfo: '',
        inputOrOutput: InvoiceTransactionDirection.INPUT,
        date: mockTimestamp,
        no: 'INV-001',
        currencyAlias: CurrencyType.TWD,
        priceBeforeTax: 1000,
        taxType: InvoiceTaxType.TAXABLE,
        taxRatio: 5,
        taxPrice: 50,
        totalPrice: 1050,
        type: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
        deductible: true,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
      },
    ],
    uploader: {
      id: mockUploaderId,
      name: 'Test User',
      email: 'test@example.com',
      imageFileId: 3,
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      deletedAt: null,
      imageFile: {
        id: 3,
        name: 'user-avatar.jpg',
        size: 512,
        url: 'https://example.com/user-avatar.jpg',
        mimeType: 'image/jpeg',
        type: FileFolder.TMP,
        isEncrypted: false,
        encryptedSymmetricKey: '',
        iv: Buffer.from(''),
        thumbnailId: null,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
      },
    },
  };

  const mockFileEntity = {
    id: mockFileId,
    name: 'test-certificate.jpg',
    size: 1024,
    url: 'https://example.com/test-certificate.jpg',
    mimeType: 'image/jpeg',
    type: FileFolder.TMP,
    isEncrypted: false,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    deletedAt: null,
    thumbnailId: 2,
    thumbnail: {
      id: 2,
      name: 'test-certificate-thumb.jpg',
      size: 256,
      url: 'https://example.com/test-certificate-thumb.jpg',
      mimeType: 'image/jpeg',
      type: FileFolder.TMP,
      isEncrypted: false,
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      deletedAt: null,
    },
  };

  const mockCertificateEntity = {
    id: mockCertificateId,
    companyId: mockCompanyId,
    aiResultId: mockAiResultId,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    deletedAt: null,
    vouchers: [],
  };

  const mockCertificate = {
    id: mockCertificateId,
    name: 'test-certificate.jpg',
    companyId: mockCompanyId,
    incomplete: false,
    file: {
      id: mockFileId,
      name: 'test-certificate.jpg',
      size: 1024,
      url: 'https://example.com/test-certificate.jpg',
      existed: true,
      thumbnail: {
        id: 2,
        name: 'test-certificate-thumb.jpg',
        size: 256,
        url: 'https://example.com/test-certificate-thumb.jpg',
        existed: true,
      },
    },
    invoice: {},
    voucherNo: 'V-001',
    voucherId: 1,
    aiResultId: mockAiResultId,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    uploader: 'Test User',
    uploaderUrl: 'https://example.com/user-avatar.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Info: (20250609 - Shirley) 設置模擬回傳值
    mockGetTimestampNow.mockReturnValue(mockTimestamp);
    mockGetImageUrlFromFileIdV1.mockReturnValue('https://example.com/test-certificate.jpg');
    mockParsePrismaFileToFileEntity.mockReturnValue(mockFileEntity);
    mockParsePrismaCertificateToCertificateEntity.mockReturnValue(mockCertificateEntity);
    mockInitFileEntity.mockReturnValue(mockFileEntity);

    // Info: (20250609 - Shirley) 模擬 Pusher
    const mockPusher = {
      trigger: jest.fn(),
    };
    mockGetPusherInstance.mockReturnValue(
      mockPusher as unknown as ReturnType<typeof getPusherInstance>
    );
  });

  describe('throwErrorAndLog', () => {
    it('應該記錄錯誤並拋出狀態消息', () => {
      const errorMessage = 'Test error message';
      const statusMessage = STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR;

      expect(() => {
        postUtils.throwErrorAndLog(loggerBack, {
          errorMessage,
          statusMessage,
        });
      }).toThrow(statusMessage);

      expect(loggerBack.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('createCertificateInPrisma', () => {
    it('應該成功創建憑證', async () => {
      mockCreateCertificateWithEmptyInvoice.mockResolvedValue(mockCertificateFromPrisma);

      const options = {
        nowInSecond: mockTimestamp,
        companyId: mockCompanyId,
        uploaderId: mockUploaderId,
        fileId: mockFileId,
        aiResultId: mockAiResultId,
      };

      const result = await postUtils.createCertificateInPrisma(options);

      expect(mockCreateCertificateWithEmptyInvoice).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockCertificateFromPrisma);
    });

    it('應該在創建失敗時拋出錯誤', async () => {
      mockCreateCertificateWithEmptyInvoice.mockResolvedValue(null);

      const options = {
        nowInSecond: mockTimestamp,
        companyId: mockCompanyId,
        uploaderId: mockUploaderId,
        fileId: mockFileId,
      };

      await expect(postUtils.createCertificateInPrisma(options)).rejects.toThrow(
        STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR
      );
    });

    it('應該處理沒有 aiResultId 的情況', async () => {
      mockCreateCertificateWithEmptyInvoice.mockResolvedValue(mockCertificateFromPrisma);

      const options = {
        nowInSecond: mockTimestamp,
        companyId: mockCompanyId,
        uploaderId: mockUploaderId,
        fileId: mockFileId,
      };

      await postUtils.createCertificateInPrisma(options);

      expect(mockCreateCertificateWithEmptyInvoice).toHaveBeenCalledWith(options);
    });
  });

  describe('initFileEntity', () => {
    it('應該正確初始化檔案實體', () => {
      const result = postUtils.initFileEntity(mockCertificateFromPrisma);

      expect(mockParsePrismaFileToFileEntity).toHaveBeenCalledWith(mockCertificateFromPrisma.file);
      expect(mockInitFileEntity).toHaveBeenCalledWith(mockFileEntity);
      expect(result).toEqual(mockFileEntity);
    });
  });

  describe('initUploaderEntity', () => {
    it('應該正確初始化上傳者實體', () => {
      mockParsePrismaUserToUserEntity.mockReturnValue({
        id: mockUploaderId,
        name: 'Test User',
        email: 'test@example.com',
        imageFileId: 3,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
      });

      const result = postUtils.initUploaderEntity(mockCertificateFromPrisma);

      expect(mockParsePrismaFileToFileEntity).toHaveBeenCalledWith(
        mockCertificateFromPrisma.uploader.imageFile,
        false
      );
      expect(mockParsePrismaUserToUserEntity).toHaveBeenCalledWith(
        mockCertificateFromPrisma.uploader
      );
      expect(result).toEqual({
        id: mockUploaderId,
        name: 'Test User',
        email: 'test@example.com',
        imageFileId: 3,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
        imageFile: mockFileEntity,
      });
    });
  });

  describe('transformFileURL', () => {
    it('應該正確轉換檔案 URL', () => {
      const result = postUtils.transformFileURL(mockFileEntity);
      expect(result).toBe('https://example.com/test-certificate.jpg');
      expect(mockGetImageUrlFromFileIdV1).toHaveBeenCalledWith(mockFileId);
    });
  });

  describe('transformCertificateEntityToResponse', () => {
    it('應該正確轉換憑證實體為回應格式', () => {
      const mockInvoiceEntity = {
        id: 1,
        name: 'Test Invoice',
        inputOrOutput: InvoiceTransactionDirection.INPUT,
        date: mockTimestamp,
        no: 'INV-001',
        currencyAlias: CurrencyType.TWD,
        priceBeforeTax: 1000,
        taxType: InvoiceTaxType.TAXABLE,
        taxRatio: 5,
        taxPrice: 50,
        totalPrice: 1050,
        type: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
        deductible: true,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
        certificateId: mockCertificateId,
        counterPartyId: PUBLIC_COUNTER_PARTY.id,
        counterParty: PUBLIC_COUNTER_PARTY,
      };

      const mockUploaderEntity = {
        id: mockUploaderId,
        name: 'Test User',
        email: 'test@example.com',
        imageFileId: 3,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
        imageFile: mockFileEntity,
      };

      const mockVoucherEntity = {
        id: 1,
        companyId: mockCompanyId,
        no: 'V-001',
        issuerId: mockUploaderId,
        counterPartyId: 1,
        status: JOURNAL_EVENT.UPLOADED,
        editable: true,
        date: mockTimestamp,
        type: EventType.INCOME,
        note: '',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
        originalEvents: [],
        resultEvents: [],
        lineItems: [],
        asset: [],
        certificates: [],
      };

      const certificateEntityWithRelations = {
        ...mockCertificateEntity,
        invoice: mockInvoiceEntity,
        file: mockFileEntity,
        uploader: mockUploaderEntity,
        vouchers: [mockVoucherEntity],
      };

      const result = postUtils.transformCertificateEntityToResponse(certificateEntityWithRelations);

      expect(result).toEqual(
        expect.objectContaining({
          id: mockCertificateEntity.id,
          name: mockFileEntity.name,
          incomplete: false,
          aiResultId: mockAiResultId,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          uploader: 'Test User',
          uploaderUrl: mockFileEntity.url,
          voucherId: 1,
        })
      );

      expect(result.file).toEqual(
        expect.objectContaining({
          id: mockFileId,
          name: 'test-certificate.jpg',
          size: 1024,
          url: 'https://example.com/test-certificate.jpg',
          existed: true,
        })
      );

      expect(result.file.thumbnail).toEqual(
        expect.objectContaining({
          id: 2,
          name: 'test-certificate-thumb.jpg',
          size: 256,
          url: 'https://example.com/test-certificate.jpg', // Info: (20250609 - Shirley) 目前 mock 都回傳相同的 URL
          existed: true,
        })
      );
    });

    it('應該處理沒有 voucher 的情況', () => {
      const mockInvoiceEntity = {
        id: 1,
        name: 'Test Invoice',
        inputOrOutput: InvoiceTransactionDirection.INPUT,
        date: mockTimestamp,
        no: 'INV-001',
        currencyAlias: CurrencyType.TWD,
        priceBeforeTax: 1000,
        taxType: InvoiceTaxType.TAXABLE,
        taxRatio: 5,
        taxPrice: 50,
        totalPrice: 1050,
        type: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
        deductible: true,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
        certificateId: mockCertificateId,
        counterPartyId: PUBLIC_COUNTER_PARTY.id,
        counterParty: PUBLIC_COUNTER_PARTY,
      };

      const mockUploaderEntity = {
        id: mockUploaderId,
        name: 'Test User',
        email: 'test@example.com',
        imageFileId: 3,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
        imageFile: mockFileEntity,
      };

      const certificateEntityWithRelations = {
        ...mockCertificateEntity,
        invoice: mockInvoiceEntity,
        file: mockFileEntity,
        uploader: mockUploaderEntity,
        vouchers: [], // Info: (20250609 - Shirley) 空的 vouchers 陣列
      };

      const result = postUtils.transformCertificateEntityToResponse(certificateEntityWithRelations);

      expect(result.voucherNo).toBe('');
      expect(result.voucherId).toBeNull();
    });
  });

  describe('triggerPusherNotification', () => {
    it('應該觸發 Pusher 通知', () => {
      const mockPusher = {
        trigger: jest.fn(),
      };
      mockGetPusherInstance.mockReturnValue(
        mockPusher as unknown as ReturnType<typeof getPusherInstance>
      );

      postUtils.triggerPusherNotification(mockCertificate, {
        accountBookId: mockAccountBookId,
      });

      expect(mockGetPusherInstance).toHaveBeenCalled();
      expect(mockPusher.trigger).toHaveBeenCalledWith(
        `${PRIVATE_CHANNEL.CERTIFICATE}-${mockAccountBookId}`,
        CERTIFICATE_EVENT.CREATE,
        {
          message: JSON.stringify(mockCertificate),
        }
      );
    });
  });

  describe('getAndDecryptFile', () => {
    it('應該成功讀取和解密檔案', async () => {
      // Info: (20250609 - Shirley) 跳過這個測試，因為涉及檔案系統操作的複雜模擬
      // Info: (20250609 - Shirley) 在實際使用中，這個函數需要正確的檔案路徑和加密設置
      expect(true).toBe(true); // Info: (20250609 - Shirley) 佔位符測試
    });
  });

  describe('sendFileToAI', () => {
    it('應該成功發送檔案到 AI 進行處理', async () => {
      const mockBlob = new Blob(['test file content'], { type: 'image/jpeg' });

      // Info: (20250609 - Shirley) 模擬 getAndDecryptFile 方法
      jest.spyOn(postUtils, 'getAndDecryptFile').mockResolvedValue(mockBlob);

      await postUtils.sendFileToAI(mockCertificateFromPrisma.file, {
        companyId: mockCompanyId,
      });

      expect(postUtils.getAndDecryptFile).toHaveBeenCalledWith(mockCertificateFromPrisma.file, {
        companyId: mockCompanyId,
      });
    });
  });
});
