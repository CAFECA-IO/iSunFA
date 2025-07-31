import { NextApiRequest, NextApiResponse } from 'next';
import { setSession, getSession } from '@/lib/utils/session';
import { updateUserLastLoginAt } from '@/lib/utils/repo/user_role.repo';
import { IUserRole } from '@/interfaces/user_role';
import { RoleName, RoleType } from '@/constants/role';
import handler from '@/pages/api/v2/user/[userId]/selected_role/index';
import { withRequestValidation } from '@/lib/utils/middleware';
import { ISessionData } from '@/interfaces/session';

// Info: (20250603 - Shirley) 模擬依賴
jest.mock('@/lib/utils/session');
jest.mock('@/lib/utils/repo/user_role.repo');
jest.mock('@/lib/utils/middleware');

// Info: (20250603 - Shirley) 設置模擬函數
const mockSetSession = jest.mocked(setSession);
const mockGetSession = jest.mocked(getSession);
const mockUpdateUserLastLoginAt = jest.mocked(updateUserLastLoginAt);
const mockWithRequestValidation = jest.mocked(withRequestValidation);

// ToDo: (20250612 - Shirley) Revise ineffective test cases
describe('角色選擇功能測試', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockUserRole: IUserRole;
  let mockSession: ISessionData;

  beforeEach(() => {
    // Info: (20250603 - Shirley) 重置所有模擬
    jest.clearAllMocks();

    // Info: (20250603 - Shirley) 初始化模擬請求
    mockReq = {
      method: 'PUT',
      query: { userId: '1' },
      body: { roleName: RoleName.INDIVIDUAL },
      headers: {
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'Test User Agent',
      },
    };

    // Info: (20250603 - Shirley) 初始化模擬響應
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Info: (20250603 - Shirley) 初始化模擬 session
    mockSession = {
      isunfa: 'session-id-123',
      deviceId: 'test-device-id',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
      userId: 1,
      companyId: 0,
      roleId: 0,
      actionTime: 1640995200,
      expires: 1640995200 + 3600,
      teams: [],
    };

    // Info: (20250603 - Shirley) 初始化模擬用戶角色
    mockUserRole = {
      id: 1,
      userId: 1,
      roleName: RoleName.INDIVIDUAL,
      type: RoleType.USER,
      lastLoginAt: 1640995200,
      createdAt: 1640995200,
      updatedAt: 1640995200,
    };

    // Info: (20250603 - Shirley) 設置模擬回傳值
    mockGetSession.mockResolvedValue(mockSession);
    mockSetSession.mockResolvedValue({ ...mockSession, roleId: mockUserRole.id });
    mockUpdateUserLastLoginAt.mockResolvedValue(mockUserRole);

    // Info: (20250603 - Shirley) 模擬 withRequestValidation 的實現，直接調用處理函數
    mockWithRequestValidation.mockImplementation((apiName, req, handlerFn) => {
      return handlerFn({
        req,
        query: req.query,
        body: req.body,
        session: mockSession,
      });
    });
  });

  it('應該成功選擇個人角色', async () => {
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    // Info: (20250603 - Shirley) 驗證更新最後登入時間函數被正確呼叫
    expect(mockUpdateUserLastLoginAt).toHaveBeenCalledWith({
      userId: '1',
      roleName: RoleName.INDIVIDUAL,
    });

    // Info: (20250603 - Shirley) 驗證 session 更新
    expect(mockSetSession).toHaveBeenCalledWith(mockSession, { roleId: 1 });

    // Info: (20250603 - Shirley) 驗證 API 回應格式
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        payload: expect.objectContaining({
          roleName: RoleName.INDIVIDUAL,
        }),
      })
    );
  });

  it('應該成功選擇會計師角色', async () => {
    // Info: (20250603 - Shirley) 修改測試數據為會計師角色
    const accountingRole = {
      ...mockUserRole,
      roleName: RoleName.ACCOUNTING_FIRMS,
    };
    mockUpdateUserLastLoginAt.mockResolvedValue(accountingRole);
    mockReq.body = { roleName: RoleName.ACCOUNTING_FIRMS };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    // Info: (20250603 - Shirley) 驗證更新最後登入時間函數被正確呼叫
    expect(mockUpdateUserLastLoginAt).toHaveBeenCalledWith({
      userId: '1',
      roleName: RoleName.ACCOUNTING_FIRMS,
    });

    // Info: (20250603 - Shirley) 驗證 session 更新
    expect(mockSetSession).toHaveBeenCalledWith(mockSession, { roleId: 1 });

    // Info: (20250603 - Shirley) 驗證 API 回應包含正確的角色資料
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          roleName: RoleName.ACCOUNTING_FIRMS,
        }),
      })
    );
  });

  it('應該成功選擇企業角色', async () => {
    // Info: (20250603 - Shirley) 修改測試數據為企業角色
    const enterpriseRole = {
      ...mockUserRole,
      roleName: RoleName.ENTERPRISE,
    };
    mockUpdateUserLastLoginAt.mockResolvedValue(enterpriseRole);
    mockReq.body = { roleName: RoleName.ENTERPRISE };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    // Info: (20250603 - Shirley) 驗證更新最後登入時間函數被正確呼叫
    expect(mockUpdateUserLastLoginAt).toHaveBeenCalledWith({
      userId: '1',
      roleName: RoleName.ENTERPRISE,
    });

    // Info: (20250603 - Shirley) 驗證 session 更新
    expect(mockSetSession).toHaveBeenCalledWith(mockSession, { roleId: 1 });

    // Info: (20250603 - Shirley) 驗證 API 回應包含正確的角色資料
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          roleName: RoleName.ENTERPRISE,
        }),
      })
    );
  });

  it('當角色不存在時應該返回資源不存在錯誤', async () => {
    // Info: (20250603 - Shirley) 模擬角色不存在的情況
    mockUpdateUserLastLoginAt.mockResolvedValue(null);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    // Info: (20250603 - Shirley) 驗證 API 回應包含資源不存在的狀態
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        payload: null,
      })
    );
  });

  it('當使用不支持的 HTTP 方法時應該返回方法不允許錯誤', async () => {
    // Info: (20250603 - Shirley) 設置不支持的 HTTP 方法
    mockReq.method = 'GET';

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    // Info: (20250603 - Shirley) 驗證 API 回應包含方法不允許錯誤
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Method not allowed'),
      })
    );
  });
});
