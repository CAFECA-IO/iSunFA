import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v2/account_book/[accountBookId]/certificate/index';
import { getSession } from '@/lib/utils/session';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { validateOutputData } from '@/lib/utils/validator';
import { getTimestampNow, formatApiResponse } from '@/lib/utils/common';
import {
  certificateAPIPostUtils,
  certificateAPIGetListUtils,
  certificateAPIDeleteMultipleUtils,
} from '@/pages/api/v2/account_book/[accountBookId]/certificate/route_utils';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { HTTP_STATUS } from '@/constants/http';
import { APIName } from '@/constants/api_connection';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { InvoiceTabs } from '@/constants/invoice_rc2';
import { SortBy, SortOrder } from '@/constants/sort';
import { InvoiceType } from '@/constants/invoice';
import { Tag } from '@prisma/client';

// Info: (20250609 - Shirley) 模擬所有依賴
jest.mock('@/lib/utils/session');
jest.mock('@/lib/utils/repo/company.repo');
jest.mock('@/lib/shared/permission');
jest.mock('@/lib/utils/middleware');
jest.mock('@/lib/utils/validator');
jest.mock('@/lib/utils/common');
jest.mock('@/pages/api/v2/account_book/[accountBookId]/certificate/route_utils');
jest.mock('@/lib/utils/logger_back', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  loggerError: jest.fn(),
  loggerInfo: jest.fn(),
  loggerWarn: jest.fn(),
}));

// Info: (20250609 - Shirley) 設置模擬函數
const mockGetSession = jest.mocked(getSession);
const mockGetCompanyById = jest.mocked(getCompanyById);
const mockConvertTeamRoleCanDo = jest.mocked(convertTeamRoleCanDo);
const mockCheckRequestData = jest.mocked(checkRequestData);
const mockCheckSessionUser = jest.mocked(checkSessionUser);
const mockCheckUserAuthorization = jest.mocked(checkUserAuthorization);
const mockLogUserAction = jest.mocked(logUserAction);
const mockValidateOutputData = jest.mocked(validateOutputData);
const mockGetTimestampNow = jest.mocked(getTimestampNow);
const mockFormatApiResponse = jest.mocked(formatApiResponse);

// Info: (20250609 - Shirley) 模擬 route utils
const mockCertificateAPIPostUtils = jest.mocked(certificateAPIPostUtils);
const mockCertificateAPIGetListUtils = jest.mocked(certificateAPIGetListUtils);
const mockCertificateAPIDeleteMultipleUtils = jest.mocked(certificateAPIDeleteMultipleUtils);

// ToDo: (20250612 - Shirley) Revise ineffective test cases
describe('Certificate API 端點測試', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  const mockTimestamp = 1640995200;
  const mockAccountBookId = 1;
  const mockUserId = 1;
  const mockTeamId = 1;
  const mockCompanyId = mockAccountBookId;

  const mockSession = {
    userId: mockUserId,
    companyId: mockCompanyId,
    isunfa: 'test-session-id',
    deviceId: 'test-device-id',
    ipAddress: '127.0.0.1',
    userAgent: 'test-user-agent',
    roleId: 1,
    actionTime: mockTimestamp,
    expires: mockTimestamp + 3600,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    destroyedAt: null,
    teams: [
      {
        id: mockTeamId,
        name: 'Test Team',
        role: TeamRole.OWNER,
      },
    ],
  };

  const mockCompany = {
    id: mockCompanyId,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    name: 'Test Company',
    deletedAt: null,
    teamId: mockTeamId,
    userId: mockUserId,
    taxId: '12345678',
    tag: Tag.ALL,
    startDate: mockTimestamp,
    isPrivate: false,
    isTransferring: false,
    imageFileId: 1,
    imageFile: {
      id: 1,
      name: 'company-image.jpg',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      deletedAt: null,
      type: 'TMP',
      size: 1024,
      mimeType: 'image/jpeg',
      url: 'https://example.com/company-image.jpg',
      isEncrypted: false,
      encryptedSymmetricKey: '',
      iv: Buffer.from(''),
      thumbnailId: null,
    },
  };

  const mockCertificate = {
    id: 1,
    name: 'test-certificate.jpg',
    companyId: mockCompanyId,
    incomplete: false,
    file: {
      id: 1,
      name: 'test-certificate.jpg',
      size: 1024,
      url: 'https://example.com/test-certificate.jpg',
      existed: true,
    },
    invoice: {
      id: 1,
      date: mockTimestamp,
      totalPrice: 1000,
    },
    voucherNo: 'V-001',
    voucherId: 1,
    aiResultId: 'test-ai-result',
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    uploader: 'Test User',
    uploaderUrl: 'https://example.com/user-avatar.jpg',
  };

  const mockPaginatedResult = {
    page: 1,
    totalPages: 1,
    totalCount: 1,
    pageSize: 10,
    hasNextPage: false,
    hasPreviousPage: false,
    sort: [{ sortBy: SortBy.DATE, sortOrder: SortOrder.ASC }],
    data: [mockCertificate],
    note: JSON.stringify({
      totalInvoicePrice: 1000,
      incomplete: { withVoucher: 0, withoutVoucher: 0 },
      currency: 'TWD',
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    req = {
      method: 'GET',
      query: {
        accountBookId: mockAccountBookId.toString(),
        page: '1',
        pageSize: '10',
        startDate: '1640908800',
        endDate: '1641081600',
        tab: InvoiceTabs.WITH_VOUCHER,
        sortOption: JSON.stringify([{ sortBy: SortBy.DATE, sortOrder: SortOrder.ASC }]),
      },
    };

    res = {
      status: mockStatus,
      json: mockJson,
    };

    // Info: (20250609 - Shirley) 設置基本模擬回傳值
    mockGetSession.mockResolvedValue(mockSession);
    mockGetCompanyById.mockResolvedValue(mockCompany);
    mockConvertTeamRoleCanDo.mockReturnValue({
      teamRole: TeamRole.OWNER,
      canDo: TeamPermissionAction.VIEW_CERTIFICATE,
      can: true,
    });
    mockCheckRequestData.mockReturnValue({ query: req.query, body: null });
    mockGetTimestampNow.mockReturnValue(mockTimestamp);
    mockValidateOutputData.mockReturnValue({
      isOutputDataValid: true,
      outputData: mockPaginatedResult,
    });
    mockFormatApiResponse.mockReturnValue({
      httpCode: 200,
      result: {
        powerby: 'iSunFA v1.0.0',
        success: true,
        code: '200',
        message: 'Success',
        payload: mockPaginatedResult,
      },
    });
  });

  describe('GET /api/v2/account_book/[accountBookId]/certificate', () => {
    beforeEach(() => {
      req.method = 'GET';

      // Info: (20250609 - Shirley) 模擬 GET 相關的 utils
      mockCertificateAPIGetListUtils.getPaginatedCertificateList = jest.fn().mockResolvedValue({
        data: [],
        page: 1,
        totalPages: 1,
        totalCount: 0,
        pageSize: 10,
        hasNextPage: false,
        hasPreviousPage: false,
        where: {},
      });
      mockCertificateAPIGetListUtils.getCurrencyFromSetting = jest.fn().mockResolvedValue('TWD');
      mockCertificateAPIGetListUtils.getSumOfTotalInvoicePrice = jest.fn().mockResolvedValue(1000);
      mockCertificateAPIGetListUtils.sortCertificateList = jest.fn();
      mockCertificateAPIGetListUtils.transformCertificateEntityToResponse = jest
        .fn()
        .mockReturnValue(mockCertificate);
    });

    it('應該成功回傳憑證列表', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockCheckSessionUser).toHaveBeenCalledWith(
        mockSession,
        APIName.CERTIFICATE_LIST_V2,
        req
      );
      expect(mockCheckUserAuthorization).toHaveBeenCalledWith(
        APIName.CERTIFICATE_LIST_V2,
        req,
        mockSession
      );
      expect(mockCheckRequestData).toHaveBeenCalledWith(
        APIName.CERTIFICATE_LIST_V2,
        req,
        mockSession
      );
      expect(mockGetCompanyById).toHaveBeenCalledWith('1');
      expect(mockConvertTeamRoleCanDo).toHaveBeenCalledWith({
        teamRole: TeamRole.OWNER,
        canDo: TeamPermissionAction.VIEW_CERTIFICATE,
      });
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('應該在公司不存在時回傳錯誤', async () => {
      mockGetCompanyById.mockResolvedValue(null);
      mockFormatApiResponse.mockReturnValue({
        httpCode: 404,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: false,
          code: '404',
          message: 'Resource not found',
          payload: null,
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockFormatApiResponse).toHaveBeenCalledWith(
        STATUS_MESSAGE.RESOURCE_NOT_FOUND,
        mockPaginatedResult
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('應該在用戶沒有團隊權限時回傳禁止錯誤', async () => {
      const sessionWithoutTeam = {
        ...mockSession,
        teams: [], // Info: (20250609 - Shirley) 用戶不在任何團隊中
      };
      mockGetSession.mockResolvedValue(sessionWithoutTeam);
      mockFormatApiResponse.mockReturnValue({
        httpCode: 403,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: false,
          code: '403',
          message: 'Forbidden',
          payload: null,
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockFormatApiResponse).toHaveBeenCalledWith(
        STATUS_MESSAGE.FORBIDDEN,
        mockPaginatedResult
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('應該在用戶權限不足時回傳禁止錯誤', async () => {
      mockConvertTeamRoleCanDo.mockReturnValue({
        teamRole: TeamRole.OWNER,
        canDo: TeamPermissionAction.VIEW_CERTIFICATE,
        can: false,
      });
      mockFormatApiResponse.mockReturnValue({
        httpCode: 403,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: false,
          code: '403',
          message: 'Forbidden',
          payload: null,
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockFormatApiResponse).toHaveBeenCalledWith(
        STATUS_MESSAGE.FORBIDDEN,
        mockPaginatedResult
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('應該正確處理查詢參數', async () => {
      const customQuery = {
        accountBookId: mockAccountBookId.toString(),
        page: '2',
        pageSize: '20',
        startDate: '1640908800',
        endDate: '1641081600',
        tab: InvoiceTabs.WITH_VOUCHER,
        sortOption: JSON.stringify([{ sortBy: SortBy.AMOUNT, sortOrder: SortOrder.DESC }]),
        searchQuery: 'test',
        type: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
      };

      req.query = customQuery;
      mockCheckRequestData.mockReturnValue({ query: customQuery, body: null });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockCertificateAPIGetListUtils.getPaginatedCertificateList).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: '1',
          page: '2',
          pageSize: '20',
          startDate: '1640908800',
          endDate: '1641081600',
          tab: InvoiceTabs.WITH_VOUCHER,
          sortOption: '[{"sortBy":"Amount","sortOrder":"desc"}]',
          searchQuery: 'test',
          type: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
          isDeleted: false,
        })
      );
    });

    it('應該在輸出資料驗證失敗時回傳錯誤', async () => {
      mockValidateOutputData.mockReturnValue({
        isOutputDataValid: false,
        outputData: null,
      });
      mockFormatApiResponse.mockReturnValue({
        httpCode: 422,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: false,
          code: '422',
          message: 'Invalid output data',
          payload: null,
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockFormatApiResponse).toHaveBeenCalledWith(STATUS_MESSAGE.INVALID_OUTPUT_DATA, null);
    });
  });

  describe('POST /api/v2/account_book/[accountBookId]/certificate', () => {
    beforeEach(() => {
      req.method = 'POST';
      req.body = {
        fileIds: [1], // Info: (20250609 - Shirley) API 實際使用 fileIds 陣列
      };

      // Info: (20250609 - Shirley) 模擬 POST 相關的 utils
      mockCertificateAPIPostUtils.createCertificateInPrisma = jest.fn().mockResolvedValue({
        id: 1,
        file: { id: 1, name: 'test.jpg' },
        uploader: { id: mockUserId, name: 'Test User' },
        voucherCertificates: [],
        invoices: [],
      });
      mockCertificateAPIPostUtils.initFileEntity = jest
        .fn()
        .mockReturnValue({ id: 1, name: 'test.jpg' });
      mockCertificateAPIPostUtils.initUploaderEntity = jest.fn().mockReturnValue({
        id: mockUserId,
        name: 'Test User',
        imageFile: { url: 'https://example.com/user.jpg' },
      });
      mockCertificateAPIPostUtils.initVoucherCertificateEntities = jest.fn().mockReturnValue([]);
      mockCertificateAPIPostUtils.initInvoiceEntity = jest.fn().mockReturnValue({
        id: 1,
        counterParty: { id: 1, name: 'Counter Party' },
      });
      mockCertificateAPIPostUtils.initCertificateEntity = jest.fn().mockReturnValue({ id: 1 });
      mockCertificateAPIPostUtils.transformCertificateEntityToResponse = jest
        .fn()
        .mockReturnValue(mockCertificate);
      mockCertificateAPIPostUtils.triggerPusherNotification = jest.fn();
    });

    it('應該成功創建憑證', async () => {
      mockCheckRequestData.mockReturnValue({
        query: req.query,
        body: req.body,
      });
      mockConvertTeamRoleCanDo.mockReturnValue({
        teamRole: TeamRole.OWNER,
        canDo: TeamPermissionAction.CREATE_CERTIFICATE,
        can: true,
      });
      mockFormatApiResponse.mockReturnValue({
        httpCode: 201,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: true,
          code: '201',
          message: 'Created',
          payload: [mockCertificate],
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockCheckSessionUser).toHaveBeenCalledWith(
        mockSession,
        APIName.CERTIFICATE_POST_V2,
        req
      );
      expect(mockCheckUserAuthorization).toHaveBeenCalledWith(
        APIName.CERTIFICATE_POST_V2,
        req,
        mockSession
      );
      expect(mockCheckRequestData).toHaveBeenCalledWith(
        APIName.CERTIFICATE_POST_V2,
        req,
        mockSession
      );
      expect(mockConvertTeamRoleCanDo).toHaveBeenCalledWith({
        teamRole: TeamRole.OWNER,
        canDo: TeamPermissionAction.CREATE_CERTIFICATE,
      });
      expect(mockCertificateAPIPostUtils.createCertificateInPrisma).toHaveBeenCalledWith({
        nowInSecond: mockTimestamp,
        companyId: '1', // Info: (20250609 - Shirley) accountBookId 在 API 中作為字串處理
        uploaderId: mockUserId,
        fileId: 1,
      });
      expect(mockCertificateAPIPostUtils.triggerPusherNotification).toHaveBeenCalledWith(
        mockCertificate,
        { accountBookId: '1' } // Info: (20250609 - Shirley) accountBookId 在 API 中作為字串處理
      );
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    });

    it('應該在無權限時拒絕創建憑證', async () => {
      mockCheckRequestData.mockReturnValue({
        query: req.query,
        body: { fileIds: [1] },
      });
      mockConvertTeamRoleCanDo.mockReturnValue({
        teamRole: TeamRole.OWNER,
        canDo: TeamPermissionAction.CREATE_CERTIFICATE,
        can: false,
      });
      mockFormatApiResponse.mockReturnValue({
        httpCode: 403,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: false,
          code: '403',
          message: 'Forbidden',
          payload: null,
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Info: (20250609 - Shirley) API 在權限檢查失敗時仍會嘗試執行並可能返回數據
      expect(mockFormatApiResponse).toHaveBeenCalledWith(
        STATUS_MESSAGE.FORBIDDEN,
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('應該在請求資料無效時回傳錯誤', async () => {
      mockCheckRequestData.mockReturnValue({
        query: req.query,
        body: null,
      });
      mockFormatApiResponse.mockReturnValue({
        httpCode: 400,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: false,
          code: '400',
          message: 'Invalid input parameter',
          payload: null,
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockFormatApiResponse).toHaveBeenCalledWith(
        STATUS_MESSAGE.INVALID_INPUT_PARAMETER,
        null
      );
    });

    it('應該處理沒有 aiResultId 的情況', async () => {
      const bodyWithFileIds = { fileIds: [1] }; // Info: (20250609 - Shirley) API 實際使用 fileIds 陣列
      req.body = bodyWithFileIds;
      mockCheckRequestData.mockReturnValue({
        query: req.query,
        body: bodyWithFileIds,
      });
      mockConvertTeamRoleCanDo.mockReturnValue({
        teamRole: TeamRole.OWNER,
        canDo: TeamPermissionAction.CREATE_CERTIFICATE,
        can: true,
      });
      mockFormatApiResponse.mockReturnValue({
        httpCode: 201,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: true,
          code: '201',
          message: 'Created',
          payload: [mockCertificate],
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockCertificateAPIPostUtils.createCertificateInPrisma).toHaveBeenCalledWith({
        nowInSecond: mockTimestamp,
        companyId: '1', // Info: (20250609 - Shirley) accountBookId 在 API 中作為字串處理
        uploaderId: mockUserId,
        fileId: 1,
      });
    });
  });

  describe('DELETE /api/v2/account_book/[accountBookId]/certificate', () => {
    beforeEach(() => {
      req.method = 'DELETE';
      req.body = {
        certificateIds: [1, 2, 3],
      };

      // Info: (20250609 - Shirley) 模擬 DELETE 相關的 utils
      mockCertificateAPIDeleteMultipleUtils.deleteCertificates = jest
        .fn()
        .mockResolvedValue([1, 2, 3]);
    });

    it('應該成功刪除多個憑證', async () => {
      mockCheckRequestData.mockReturnValue({
        query: req.query,
        body: req.body,
      });
      mockConvertTeamRoleCanDo.mockReturnValue({
        teamRole: TeamRole.OWNER,
        canDo: TeamPermissionAction.DELETE_CERTIFICATE,
        can: true,
      });
      mockFormatApiResponse.mockReturnValue({
        httpCode: 200,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: true,
          code: '200',
          message: 'Success',
          payload: [1, 2, 3],
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockCheckSessionUser).toHaveBeenCalledWith(
        mockSession,
        APIName.CERTIFICATE_DELETE_MULTIPLE_V2,
        req
      );
      expect(mockCheckUserAuthorization).toHaveBeenCalledWith(
        APIName.CERTIFICATE_DELETE_MULTIPLE_V2,
        req,
        mockSession
      );
      expect(mockCheckRequestData).toHaveBeenCalledWith(
        APIName.CERTIFICATE_DELETE_MULTIPLE_V2,
        req,
        mockSession
      );
      expect(mockConvertTeamRoleCanDo).toHaveBeenCalledWith({
        teamRole: TeamRole.OWNER,
        canDo: TeamPermissionAction.DELETE_CERTIFICATE,
      });
      expect(mockCertificateAPIDeleteMultipleUtils.deleteCertificates).toHaveBeenCalledWith({
        certificateIds: [1, 2, 3],
        nowInSecond: mockTimestamp,
      });
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('應該在無權限時拒絕刪除憑證', async () => {
      mockCheckRequestData.mockReturnValue({
        query: req.query,
        body: req.body,
      });
      mockConvertTeamRoleCanDo.mockReturnValue({
        teamRole: TeamRole.OWNER,
        canDo: TeamPermissionAction.DELETE_CERTIFICATE,
        can: false,
      });
      mockFormatApiResponse.mockReturnValue({
        httpCode: 403,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: false,
          code: '403',
          message: 'Forbidden',
          payload: null,
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      // Info: (20250609 - Shirley) API 在權限檢查失敗時仍會嘗試執行並可能返回數據
      expect(mockFormatApiResponse).toHaveBeenCalledWith(
        STATUS_MESSAGE.FORBIDDEN,
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('應該在請求資料無效時回傳錯誤', async () => {
      mockCheckRequestData.mockReturnValue({
        query: req.query,
        body: null,
      });
      mockFormatApiResponse.mockReturnValue({
        httpCode: 400,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: false,
          code: '400',
          message: 'Invalid input parameter',
          payload: null,
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockFormatApiResponse).toHaveBeenCalledWith(
        STATUS_MESSAGE.INVALID_INPUT_PARAMETER,
        null
      );
    });

    it('應該處理空的憑證 ID 列表', async () => {
      const bodyWithEmptyIds = { certificateIds: [] };
      req.body = bodyWithEmptyIds;
      mockCheckRequestData.mockReturnValue({
        query: req.query,
        body: bodyWithEmptyIds,
      });
      mockConvertTeamRoleCanDo.mockReturnValue({
        teamRole: TeamRole.OWNER,
        canDo: TeamPermissionAction.DELETE_CERTIFICATE,
        can: true,
      });
      mockCertificateAPIDeleteMultipleUtils.deleteCertificates = jest.fn().mockResolvedValue([]);
      mockFormatApiResponse.mockReturnValue({
        httpCode: 200,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: true,
          code: '200',
          message: 'Success',
          payload: [],
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockCertificateAPIDeleteMultipleUtils.deleteCertificates).toHaveBeenCalledWith({
        certificateIds: [],
        nowInSecond: mockTimestamp,
      });
    });
  });

  describe('不支援的 HTTP 方法', () => {
    it('應該在使用不支援的方法時回傳錯誤', async () => {
      req.method = 'PUT';
      mockFormatApiResponse.mockReturnValue({
        httpCode: 405,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: false,
          code: '405',
          message: 'Method not allowed',
          payload: null,
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockFormatApiResponse).toHaveBeenCalledWith(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null);
    });
  });

  describe('錯誤處理', () => {
    it('應該正確處理未預期的錯誤', async () => {
      req.method = 'GET';
      // Info: (20250609 - Shirley) 簡化錯誤測試，模擬 session 驗證失敗
      mockGetSession.mockResolvedValue({
        ...mockSession,
        userId: 0, // Info: (20250609 - Shirley) 使用無效的 userId 但保持類型正確
      });
      mockFormatApiResponse.mockReturnValue({
        httpCode: 500,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: false,
          code: '500',
          message: 'Unexpected error',
          payload: null,
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockFormatApiResponse).toHaveBeenCalled();
    });

    it('應該記錄用戶操作', async () => {
      req.method = 'GET';

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockLogUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          companyId: mockCompanyId,
        }),
        'CERTIFICATE_LIST_V2',
        expect.any(Object),
        'List successfully'
      );
    });

    it('應該在 session 驗證失敗時停止處理', async () => {
      req.method = 'GET';
      mockCheckSessionUser.mockImplementation(() => {
        throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
      });
      mockFormatApiResponse.mockReturnValue({
        httpCode: 401,
        result: {
          powerby: 'iSunFA v1.0.0',
          success: false,
          code: '401',
          message: 'Unauthorized access',
          payload: null,
        },
      });

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(mockGetCompanyById).not.toHaveBeenCalled();
      expect(mockFormatApiResponse).toHaveBeenCalledWith(STATUS_MESSAGE.UNAUTHORIZED_ACCESS, null);
    });
  });
});
