import prisma from '@/client';
import { createAccountBook } from '@/lib/utils/repo/account_book.repo';
import { getTimestampNow } from '@/lib/utils/common';
import { generateIcon } from '@/lib/utils/generate_user_icon';
import { createFile, findFileById } from '@/lib/utils/repo/file.repo';
import { generateKeyPair, storeKeyByCompany } from '@/lib/utils/crypto';
import { checkAccountBookLimit } from '@/lib/utils/plan/check_plan_limit';
import { transaction } from '@/lib/utils/repo/transaction';
import {
  WORK_TAG,
  FILING_FREQUENCY,
  FILING_METHOD,
  DECLARANT_FILING_METHOD,
  AGENT_FILING_ROLE,
} from '@/interfaces/account_book';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { FileFolder } from '@/constants/file';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';

// Info: (20250702 - Shirley) 模擬 Prisma client
jest.mock('@/client', () => ({
  __esModule: true,
  default: {
    teamMember: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    company: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    companySetting: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    accountingSetting: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

// Info: (20250702 - Shirley) 模擬其他依賴
jest.mock('@/lib/utils/common');
jest.mock('@/lib/utils/generate_user_icon');
jest.mock('@/lib/utils/repo/file.repo');
jest.mock('@/lib/utils/crypto');
jest.mock('@/lib/utils/plan/check_plan_limit');
jest.mock('@/lib/utils/repo/transaction');
jest.mock('@/lib/shared/permission');
jest.mock('@/lib/utils/logger_back', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Info: (20250702 - Shirley) 設置模擬函數
const mockPrisma = jest.mocked(prisma);
const mockGetTimestampNow = jest.mocked(getTimestampNow);
const mockGenerateIcon = jest.mocked(generateIcon);
const mockCreateFile = jest.mocked(createFile);
const mockFindFileById = jest.mocked(findFileById);
const mockGenerateKeyPair = jest.mocked(generateKeyPair);
const mockStoreKeyByCompany = jest.mocked(storeKeyByCompany);
const mockCheckAccountBookLimit = jest.mocked(checkAccountBookLimit);
const mockTransaction = jest.mocked(transaction);
const mockConvertTeamRoleCanDo = jest.mocked(convertTeamRoleCanDo);

describe('帳本建立功能測試', () => {
  // Info: (20250702 - Shirley) 測試數據
  const mockTimestamp = 1640995200;
  const mockUserId = 1;
  const mockTeamId = 1;
  const mockAccountBookData = {
    name: '測試帳本',
    taxId: '12345678',
    tag: WORK_TAG.FINANCIAL,
    teamId: mockTeamId,
    fileId: 1,
    representativeName: '測試代表',
    taxSerialNumber: '12345',
    contactPerson: '聯絡人',
    phoneNumber: '0912345678',
    city: '台北市',
    district: '大安區',
    enteredAddress: '測試路123號',
    filingFrequency: FILING_FREQUENCY.MONTHLY_FILING,
    filingMethod: FILING_METHOD.SINGLE_ENTITY_FILING,
    declarantFilingMethod: DECLARANT_FILING_METHOD.SELF_FILING,
    declarantName: '申報人',
    declarantPersonalId: 'A123456789',
    declarantPhoneNumber: '0912345678',
    agentFilingRole: AGENT_FILING_ROLE.ACCOUNTANT,
    licenseId: '12345',
  };

  // Info: (20250702 - Shirley) 模擬 Prisma 回傳值
  const mockCreatedAccountBook = {
    id: 1,
    teamId: mockTeamId,
    userId: mockUserId,
    name: mockAccountBookData.name,
    taxId: mockAccountBookData.taxId,
    imageFileId: 1,
    startDate: mockTimestamp,
    tag: mockAccountBookData.tag,
    isPrivate: false,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    imageFile: {
      id: 1,
      url: 'https://example.com/image.jpg',
    },
  };

  const mockFile = {
    id: 1,
    name: '測試帳本_icon',
    size: 1024,
    url: 'https://example.com/image.jpg',
    mimeType: 'image/jpeg',
    type: FileFolder.TMP,
    isEncrypted: false,
    encryptedSymmetricKey: '',
    iv: Buffer.from(''),
    thumbnailId: null,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    deletedAt: null,
  };

  beforeEach(() => {
    // Info: (20250702 - Shirley) 重置所有模擬
    jest.clearAllMocks();

    // Info: (20250702 - Shirley) 設置模擬回傳值
    mockGetTimestampNow.mockReturnValue(mockTimestamp);
    mockCreateFile.mockResolvedValue(mockFile);
    mockFindFileById.mockResolvedValue(mockFile);
    mockGenerateIcon.mockResolvedValue({
      iconUrl: 'data:image/svg+xml;base64,generated-icon',
      mimeType: 'image/svg+xml',
      size: 512,
    });
    mockCheckAccountBookLimit.mockResolvedValue(undefined);
    mockGenerateKeyPair.mockResolvedValue({
      publicKey: {} as CryptoKey,
      privateKey: {} as CryptoKey,
    });
    mockStoreKeyByCompany.mockResolvedValue(undefined);
    mockConvertTeamRoleCanDo.mockReturnValue({
      teamRole: TeamRole.OWNER,
      canDo: TeamPermissionAction.CREATE_ACCOUNT_BOOK,
      can: true,
    });

    // Info: (20250702 - Shirley) 模擬 transaction 函數
    mockTransaction.mockImplementation((callback) => callback(mockPrisma));

    // Info: (20250702 - Shirley) 模擬 Prisma 方法
    mockPrisma.teamMember.findFirst = jest.fn().mockResolvedValue({
      userId: mockUserId,
      teamId: mockTeamId,
      role: TeamRole.OWNER,
    });

    mockPrisma.company.findFirst = jest.fn().mockResolvedValue(null);
    mockPrisma.company.create = jest.fn().mockResolvedValue(mockCreatedAccountBook);
    mockPrisma.companySetting.create = jest.fn().mockResolvedValue({
      id: 1,
      companyId: 1,
      taxSerialNumber: mockAccountBookData.taxSerialNumber,
      representativeName: mockAccountBookData.representativeName,
      country: '',
      phone: mockAccountBookData.phoneNumber,
      address: {
        city: mockAccountBookData.city,
        district: mockAccountBookData.district,
        enteredAddress: mockAccountBookData.enteredAddress,
      },
      countryCode: 'tw',
      contactPerson: mockAccountBookData.contactPerson,
      filingFrequency: mockAccountBookData.filingFrequency,
      filingMethod: mockAccountBookData.filingMethod,
      declarantFilingMethod: mockAccountBookData.declarantFilingMethod,
      declarantName: mockAccountBookData.declarantName,
      declarantPersonalId: mockAccountBookData.declarantPersonalId,
      declarantPhoneNumber: mockAccountBookData.declarantPhoneNumber,
      agentFilingRole: mockAccountBookData.agentFilingRole,
      licenseId: mockAccountBookData.licenseId,
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
    });
    mockPrisma.accountingSetting.create = jest.fn().mockResolvedValue({
      id: 1,
      companyId: 1,
      salesTaxTaxable: true,
      salesTaxRate: 0.05,
      purchaseTaxTaxable: true,
      purchaseTaxRate: 0.05,
      returnPeriodicity: 'monthly',
      currency: 'TWD',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
    });
  });

  describe('有效資料建立帳本成功', () => {
    it('應該成功創建帳本及相關設定', async () => {
      // Info: (20250702 - Shirley) 執行測試
      const result = await createAccountBook(mockUserId, mockAccountBookData);

      // Info: (20250702 - Shirley) 驗證結果
      expect(result).toBeDefined();
      expect(mockCheckAccountBookLimit).toHaveBeenCalledWith(mockTeamId);
      expect(mockTransaction).toHaveBeenCalled();
      expect(mockPrisma.company.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId: mockTeamId,
          userId: mockUserId,
          name: mockAccountBookData.name,
          taxId: mockAccountBookData.taxId,
          imageFileId: mockFile.id,
          tag: mockAccountBookData.tag,
        }),
        include: {
          imageFile: true,
        },
      });
      expect(mockPrisma.companySetting.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCreatedAccountBook.id,
          taxSerialNumber: mockAccountBookData.taxSerialNumber,
          representativeName: mockAccountBookData.representativeName,
          contactPerson: mockAccountBookData.contactPerson,
          phone: mockAccountBookData.phoneNumber,
        }),
      });
      expect(mockPrisma.accountingSetting.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCreatedAccountBook.id,
          salesTaxTaxable: true,
          salesTaxRate: 0.05,
        }),
      });
    });

    it('應該在未提供圖片 ID 時生成預設圖片', async () => {
      // Info: (20250702 - Shirley) 準備測試數據 - 移除 fileId
      const dataWithoutFileId = { ...mockAccountBookData };
      delete (dataWithoutFileId as { fileId?: number }).fileId;

      // Info: (20250702 - Shirley) 執行測試
      await createAccountBook(mockUserId, dataWithoutFileId);

      // Info: (20250702 - Shirley) 驗證結果
      expect(mockGenerateIcon).toHaveBeenCalledWith(dataWithoutFileId.name);
      expect(mockCreateFile).toHaveBeenCalledWith({
        name: `${dataWithoutFileId.name}_icon${mockTimestamp}`,
        size: 512,
        mimeType: 'image/svg+xml',
        type: FileFolder.TMP,
        url: 'data:image/svg+xml;base64,generated-icon',
        isEncrypted: false,
        encryptedSymmetricKey: '',
      });
    });
  });

  describe('必填欄位驗證', () => {
    it('應該在缺少必填欄位時拋出錯誤', async () => {
      // Info: (20250702 - Shirley) 準備測試數據 - 移除必填欄位
      const invalidData = { ...mockAccountBookData };
      delete (invalidData as { name?: string }).name;

      // Info: (20250702 - Shirley) 設置驗證失敗
      mockFindFileById.mockResolvedValueOnce(null);

      // Info: (20250702 - Shirley) 執行測試並驗證錯誤
      await expect(
        createAccountBook(mockUserId, invalidData as typeof mockAccountBookData)
      ).rejects.toThrow();
    });
  });

  describe('稅務 ID 格式驗證', () => {
    it('應該接受有效的稅務 ID 格式', async () => {
      // Info: (20250702 - Shirley) 準備測試數據 - 有效稅務 ID
      const dataWithValidTaxId = {
        ...mockAccountBookData,
        taxId: '53212539', // 有效統編
      };

      // Info: (20250702 - Shirley) 執行測試
      const result = await createAccountBook(mockUserId, dataWithValidTaxId);

      // Info: (20250702 - Shirley) 驗證結果
      expect(result).toBeDefined();
    });
  });

  describe('權限驗證', () => {
    it('應該檢查用戶是否有權限創建帳本', async () => {
      // Info: (20250702 - Shirley) 模擬用戶不是團隊成員
      mockPrisma.teamMember.findFirst = jest.fn().mockResolvedValue(null);

      // Info: (20250702 - Shirley) 模擬 convertTeamRoleCanDo 返回沒有權限
      mockConvertTeamRoleCanDo.mockReturnValue({
        teamRole: undefined as unknown as TeamRole,
        canDo: TeamPermissionAction.CREATE_ACCOUNT_BOOK,
        can: false,
      });

      // Info: (20250702 - Shirley) 執行測試並驗證錯誤
      await expect(createAccountBook(mockUserId, mockAccountBookData)).rejects.toThrow(
        STATUS_MESSAGE.PERMISSION_DENIED
      );

      // Info: (20250702 - Shirley) 驗證團隊成員查詢
      expect(mockPrisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          teamId: mockTeamId,
        },
      });
    });
  });

  describe('訂閱方案限制檢查', () => {
    it('應該檢查團隊是否達到帳本數量限制', async () => {
      // Info: (20250702 - Shirley) 模擬達到帳本數量限制
      mockCheckAccountBookLimit.mockRejectedValueOnce(
        new Error(STATUS_MESSAGE.ACCOUNT_BOOK_LIMIT_REACHED)
      );

      // Info: (20250702 - Shirley) 執行測試並驗證錯誤
      await expect(createAccountBook(mockUserId, mockAccountBookData)).rejects.toThrow(
        STATUS_MESSAGE.ACCOUNT_BOOK_LIMIT_REACHED
      );

      // Info: (20250702 - Shirley) 驗證限制檢查
      expect(mockCheckAccountBookLimit).toHaveBeenCalledWith(mockTeamId);
    });
  });

  describe('重複帳本名稱處理', () => {
    it('應該在發現重複的稅務 ID 時拋出錯誤', async () => {
      // Info: (20250702 - Shirley) 模擬已存在相同稅務 ID 的帳本
      mockPrisma.company.findFirst = jest.fn().mockResolvedValueOnce({
        id: 2,
        name: '已存在帳本',
        taxId: mockAccountBookData.taxId,
      });

      // Info: (20250702 - Shirley) 執行測試並驗證錯誤
      await expect(createAccountBook(mockUserId, mockAccountBookData)).rejects.toThrow(
        STATUS_MESSAGE.DUPLICATE_ACCOUNT_BOOK
      );
    });
  });

  describe('資料庫約束驗證', () => {
    it('應該處理資料庫操作失敗的情況', async () => {
      // Info: (20250702 - Shirley) 模擬資料庫操作失敗
      mockTransaction.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      // Info: (20250702 - Shirley) 執行測試並驗證錯誤
      await expect(createAccountBook(mockUserId, mockAccountBookData)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('建立後預設設定初始化', () => {
    it('應該正確初始化會計設定', async () => {
      // Info: (20250702 - Shirley) 執行測試
      await createAccountBook(mockUserId, mockAccountBookData);

      // Info: (20250702 - Shirley) 驗證會計設定初始化
      expect(mockPrisma.accountingSetting.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCreatedAccountBook.id,
          salesTaxTaxable: true,
          salesTaxRate: 0.05,
          purchaseTaxTaxable: true,
          purchaseTaxRate: 0.05,
          returnPeriodicity: 'monthly',
          currency: 'TWD',
        }),
      });
    });
  });

  describe('地址處理', () => {
    it('應該正確處理地址相關欄位', async () => {
      // Info: (20250702 - Shirley) 執行測試
      await createAccountBook(mockUserId, mockAccountBookData);

      // Info: (20250702 - Shirley) 驗證地址處理
      expect(mockPrisma.companySetting.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          address: {
            city: mockAccountBookData.city,
            district: mockAccountBookData.district,
            enteredAddress: mockAccountBookData.enteredAddress,
          },
        }),
      });
    });

    it('應該處理缺少地址欄位的情況', async () => {
      // Info: (20250702 - Shirley) 準備測試數據 - 移除地址欄位
      const dataWithoutAddress = { ...mockAccountBookData };
      delete (dataWithoutAddress as { city?: string }).city;
      delete (dataWithoutAddress as { district?: string }).district;
      delete (dataWithoutAddress as { enteredAddress?: string }).enteredAddress;

      // Info: (20250702 - Shirley) 執行測試
      await createAccountBook(mockUserId, dataWithoutAddress);

      // Info: (20250702 - Shirley) 驗證地址處理
      expect(mockPrisma.companySetting.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          address: {
            city: '',
            district: '',
            enteredAddress: '',
          },
        }),
      });
    });
  });
});
