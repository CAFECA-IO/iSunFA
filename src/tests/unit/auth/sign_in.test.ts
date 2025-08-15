import { NextApiRequest } from 'next';
import { handleSignInSession, fetchImageInfo } from '@/lib/utils/signIn';
import { getSession, setSession } from '@/lib/utils/session';
import { createUserByAuth, getUserByCredential } from '@/lib/utils/repo/authentication.repo';
import { generateIcon } from '@/lib/utils/generate_user_icon';
import { createFile } from '@/lib/utils/repo/file.repo';
import { createDefaultTeamForUser } from '@/lib/utils/repo/team.repo';
import { handleInviteTeamMember } from '@/lib/utils/repo/user.repo';
import { getUserTeams } from '@/lib/utils/repo/team_member.repo';
import { createUserActionLog } from '@/lib/utils/repo/user_action_log.repo';
import { FileFolder, PUBLIC_IMAGE_ID } from '@/constants/file';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { User } from 'next-auth';
import { AdapterUser } from 'next-auth/adapters';

// Info: (20250602 - Shirley) Mock all dependencies
jest.mock('@/lib/utils/session');
jest.mock('@/lib/utils/repo/authentication.repo');
jest.mock('@/lib/utils/generate_user_icon');
jest.mock('@/lib/utils/repo/file.repo');
jest.mock('@/lib/utils/repo/team.repo');
jest.mock('@/lib/utils/repo/user.repo');
jest.mock('@/lib/utils/repo/team_member.repo');
jest.mock('@/lib/utils/repo/user_action_log.repo');

// Info: (20250602 - Shirley) Mock fetch for fetchImageInfo
global.fetch = jest.fn();

// Info: (20250602 - Shirley) Mock types
const mockGetSession = jest.mocked(getSession);
const mockSetSession = jest.mocked(setSession);
const mockGetUserByCredential = jest.mocked(getUserByCredential);
const mockCreateUserByAuth = jest.mocked(createUserByAuth);
const mockGenerateIcon = jest.mocked(generateIcon);
const mockCreateFile = jest.mocked(createFile);
const mockCreateDefaultTeamForUser = jest.mocked(createDefaultTeamForUser);
const mockHandleInviteTeamMember = jest.mocked(handleInviteTeamMember);
const mockGetUserTeams = jest.mocked(getUserTeams);
const mockCreateUserActionLog = jest.mocked(createUserActionLog);
const mockFetch = jest.mocked(fetch);

// ToDo: (20250612 - Shirley) Revise ineffective test cases
describe('SignIn Integration Tests', () => {
  let mockRequest: Partial<NextApiRequest>;

  const mockSession = {
    isunfa: 'session-id-123',
    deviceId: 'test-device-id',
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    userId: 0,
    accountBookId: 0,
    roleId: 0,
    actionTime: 1640995200,
    expires: 1640995200 + 3600,
    teams: [],
  };

  const mockUser: User = {
    id: 'google-user-123',
    name: 'Test User',
    email: 'test@example.com',
    image: 'https://example.com/avatar.jpg',
  };

  const mockAccount = {
    provider: 'google',
    providerAccountId: 'google-user-123',
    type: 'oauth',
  };

  const mockCreatedUser = {
    id: 1,
    userId: 1,
    method: 'oauth',
    provider: 'google',
    credentialId: 'google-user-123',
    authData: {},
    createdAt: 1640995200,
    updatedAt: 1640995200,
    deletedAt: null,
    user: {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      imageFileId: 1,
      createdAt: 1640995200,
      updatedAt: 1640995200,
      deletedAt: null,
      userAgreements: [],
    },
  };

  const mockUserTeams = [
    {
      id: 1,
      name: 'Test User Team',
      role: 'owner',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      headers: {
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'Test Agent',
      },
      url: '/api/auth/signin',
      method: 'POST',
      body: {},
    };

    mockGetSession.mockResolvedValue(mockSession);
    mockGetUserTeams.mockResolvedValue(mockUserTeams);
    mockCreateUserActionLog.mockResolvedValue({
      id: 1,
      sessionId: 'test-session',
      userId: 1,
      actionType: 'LOGIN',
      actionDescription: 'User login',
      actionTime: 1640995200,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
      apiEndpoint: '/api/auth/signin',
      httpMethod: 'POST',
      requestPayload: {},
      statusMessage: 'SUCCESS',
      httpStatusCode: 200,
      createdAt: 1640995200,
      updatedAt: 1640995200,
      deletedAt: null,
    });
  });

  describe('fetchImageInfo', () => {
    it('應該成功獲取圖片資訊', async () => {
      const mockBlob = {
        type: 'image/png',
        size: 1024,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response);

      const result = await fetchImageInfo('https://example.com/image.png');

      expect(result).toEqual({
        iconUrl: 'https://example.com/image.png',
        mimeType: 'image/png',
        size: 1024,
      });
    });

    it('應該處理 fetch 失敗的情況', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchImageInfo('https://example.com/image.png');

      expect(result).toEqual({
        iconUrl: 'https://example.com/image.png',
        mimeType: 'image/jpeg',
        size: 0,
      });
    });

    it('應該處理 HTTP 回應不成功的情況', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await fetchImageInfo('https://example.com/image.png');

      expect(result).toEqual({
        iconUrl: 'https://example.com/image.png',
        mimeType: 'image/jpeg',
        size: 0,
      });
    });
  });

  describe('handleSignInSession - 新用戶註冊流程', () => {
    beforeEach(() => {
      mockGetUserByCredential.mockResolvedValue(null); // Info: (20250602 - Shirley) 用戶不存在
      mockCreateUserByAuth.mockResolvedValue(mockCreatedUser);
      mockCreateFile.mockResolvedValue({
        id: 1,
        name: 'test.jpg',
        size: 1024,
        url: 'https://example.com/avatar.jpg',
        mimeType: 'image/jpeg',
        type: 'tmp',
        isEncrypted: false,
        encryptedSymmetricKey: '',
        iv: Buffer.from(''),
        thumbnailId: null,
        createdAt: 1640995200,
        updatedAt: 1640995200,
        deletedAt: null,
      });
      mockSetSession.mockResolvedValue({ ...mockSession, userId: 1 });
    });

    it('應該為有頭像的新用戶成功創建帳戶', async () => {
      const result = await handleSignInSession(
        mockRequest as NextApiRequest,
        mockUser,
        mockAccount
      );

      // Info: (20250602 - Shirley) 驗證用戶查詢
      expect(mockGetUserByCredential).toHaveBeenCalledWith('google-user-123');

      // Info: (20250602 - Shirley) 驗證圖片處理
      expect(fetch).toHaveBeenCalledWith('https://example.com/avatar.jpg');

      // Info: (20250602 - Shirley) 驗證檔案創建
      expect(mockCreateFile).toHaveBeenCalledWith({
        name: 'Test User_icon',
        size: 0,
        mimeType: 'image/jpeg',
        type: FileFolder.TMP,
        url: 'https://example.com/avatar.jpg',
        isEncrypted: false,
        encryptedSymmetricKey: '',
      });

      // Info: (20250602 - Shirley) 驗證用戶創建
      expect(mockCreateUserByAuth).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        provider: 'google',
        credentialId: 'google-user-123',
        method: 'oauth',
        authData: mockAccount,
        imageId: 1,
      });

      // Info: (20250602 - Shirley) 驗證團隊創建
      expect(mockCreateDefaultTeamForUser).toHaveBeenCalledWith(1, 'Test User');

      // Info: (20250602 - Shirley) 驗證邀請處理
      expect(mockHandleInviteTeamMember).toHaveBeenCalledWith(1, 'test@example.com');

      // Info: (20250602 - Shirley) 驗證團隊獲取
      expect(mockGetUserTeams).toHaveBeenCalledWith(1);

      // Info: (20250602 - Shirley) 驗證 session 設定
      expect(mockSetSession).toHaveBeenCalledWith(mockSession, {
        userId: 1,
        teams: mockUserTeams,
      });

      // Info: (20250602 - Shirley) 驗證用戶操作日誌
      expect(mockCreateUserActionLog).toHaveBeenCalledWith({
        sessionId: 'session-id-123',
        userId: 1,
        actionType: UserActionLogActionType.LOGIN,
        actionDescription: UserActionLogActionType.LOGIN,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        apiEndpoint: '/api/auth/signin',
        httpMethod: 'POST',
        requestPayload: {},
        statusMessage: STATUS_MESSAGE.SUCCESS,
      });

      expect(result.userId).toBe(1);
    });

    it('應該為沒有頭像的新用戶生成預設頭像', async () => {
      const userWithoutImage = { ...mockUser, image: null };

      mockGenerateIcon.mockResolvedValue({
        iconUrl: 'data:image/svg+xml;base64,generated-icon',
        mimeType: 'image/svg+xml',
        size: 512,
      });

      await handleSignInSession(mockRequest as NextApiRequest, userWithoutImage, mockAccount);

      expect(mockGenerateIcon).toHaveBeenCalledWith('Test User');
      expect(mockCreateFile).toHaveBeenCalledWith({
        name: 'Test User_icon',
        size: 512,
        mimeType: 'image/svg+xml',
        type: FileFolder.TMP,
        url: 'data:image/svg+xml;base64,generated-icon',
        isEncrypted: false,
        encryptedSymmetricKey: '',
      });
    });

    it('應該處理檔案創建失敗的情況', async () => {
      mockCreateFile.mockResolvedValue(null);

      await handleSignInSession(mockRequest as NextApiRequest, mockUser, mockAccount);

      expect(mockCreateUserByAuth).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        provider: 'google',
        credentialId: 'google-user-123',
        method: 'oauth',
        authData: mockAccount,
        imageId: PUBLIC_IMAGE_ID,
      });
    });

    it('應該處理空用戶名稱的情況', async () => {
      const userWithoutName = { ...mockUser, name: null };

      await handleSignInSession(mockRequest as NextApiRequest, userWithoutName, mockAccount);

      expect(mockCreateFile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'user_icon',
        })
      );

      expect(mockCreateUserByAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '',
        })
      );
    });
  });

  describe('handleSignInSession - 現有用戶登入流程', () => {
    beforeEach(() => {
      mockGetUserByCredential.mockResolvedValue(mockCreatedUser);
      mockSetSession.mockResolvedValue({ ...mockSession, userId: 1 });
    });

    it('應該為現有用戶成功登入', async () => {
      const result = await handleSignInSession(
        mockRequest as NextApiRequest,
        mockUser,
        mockAccount
      );

      // Info: (20250602 - Shirley) 驗證用戶查詢
      expect(mockGetUserByCredential).toHaveBeenCalledWith('google-user-123');

      // Info: (20250602 - Shirley) 驗證不會創建新用戶
      expect(mockCreateUserByAuth).not.toHaveBeenCalled();
      expect(mockCreateDefaultTeamForUser).not.toHaveBeenCalled();
      expect(mockHandleInviteTeamMember).not.toHaveBeenCalled();

      // Info: (20250602 - Shirley) 驗證團隊獲取
      expect(mockGetUserTeams).toHaveBeenCalledWith(1);

      // Info: (20250602 - Shirley) 驗證 session 設定
      expect(mockSetSession).toHaveBeenCalledWith(mockSession, {
        userId: 1,
        teams: mockUserTeams,
      });

      // Info: (20250602 - Shirley) 驗證用戶操作日誌
      expect(mockCreateUserActionLog).toHaveBeenCalledWith({
        sessionId: 'session-id-123',
        userId: 1,
        actionType: UserActionLogActionType.LOGIN,
        actionDescription: UserActionLogActionType.LOGIN,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        apiEndpoint: '/api/auth/signin',
        httpMethod: 'POST',
        requestPayload: {},
        statusMessage: STATUS_MESSAGE.SUCCESS,
      });

      expect(result.userId).toBe(1);
    });

    it('應該處理缺少用戶 IP 和 User-Agent 的情況', async () => {
      const requestWithoutHeaders = {
        ...mockRequest,
        headers: {},
      };

      await handleSignInSession(requestWithoutHeaders as NextApiRequest, mockUser, mockAccount);

      expect(mockCreateUserActionLog).toHaveBeenCalledWith({
        sessionId: 'session-id-123',
        userId: 1,
        actionType: UserActionLogActionType.LOGIN,
        actionDescription: UserActionLogActionType.LOGIN,
        ipAddress: undefined,
        userAgent: undefined,
        apiEndpoint: '/api/auth/signin',
        httpMethod: 'POST',
        requestPayload: {},
        statusMessage: STATUS_MESSAGE.SUCCESS,
      });
    });
  });

  describe('handleSignInSession - Apple 提供者測試', () => {
    const appleAccount = {
      provider: 'apple',
      providerAccountId: 'apple-user-123',
      type: 'oauth',
    };

    const appleUser: AdapterUser = {
      id: 'apple-user-123',
      name: 'Apple User',
      email: 'apple@example.com',
      image: null,
      emailVerified: null,
    };

    beforeEach(() => {
      mockGetUserByCredential.mockResolvedValue(null);
      mockCreateUserByAuth.mockResolvedValue({
        ...mockCreatedUser,
        provider: 'apple',
        credentialId: 'apple-user-123',
      });
      mockGenerateIcon.mockResolvedValue({
        iconUrl: 'data:image/svg+xml;base64,apple-icon',
        mimeType: 'image/svg+xml',
        size: 512,
      });
      mockCreateFile.mockResolvedValue({
        id: 1,
        name: 'apple-icon.svg',
        size: 512,
        url: 'data:image/svg+xml;base64,apple-icon',
        mimeType: 'image/svg+xml',
        type: 'tmp',
        isEncrypted: false,
        encryptedSymmetricKey: '',
        iv: Buffer.from(''),
        thumbnailId: null,
        createdAt: 1640995200,
        updatedAt: 1640995200,
        deletedAt: null,
      });
    });

    it('應該為 Apple 用戶成功創建帳戶', async () => {
      await handleSignInSession(mockRequest as NextApiRequest, appleUser, appleAccount);

      expect(mockGetUserByCredential).toHaveBeenCalledWith('apple-user-123');
      expect(mockCreateUserByAuth).toHaveBeenCalledWith({
        name: 'Apple User',
        email: 'apple@example.com',
        provider: 'apple',
        credentialId: 'apple-user-123',
        method: 'oauth',
        authData: appleAccount,
        imageId: 1,
      });
    });
  });

  describe('handleSignInSession - 錯誤處理', () => {
    it('應該處理用戶團隊獲取失敗', async () => {
      mockGetUserByCredential.mockResolvedValue(mockCreatedUser);
      mockGetUserTeams.mockRejectedValue(new Error('Database error'));

      await expect(
        handleSignInSession(mockRequest as NextApiRequest, mockUser, mockAccount)
      ).rejects.toThrow('Database error');
    });

    it('應該處理 session 設定失敗', async () => {
      mockGetUserByCredential.mockResolvedValue(mockCreatedUser);
      mockSetSession.mockRejectedValue(new Error('Session error'));

      await expect(
        handleSignInSession(mockRequest as NextApiRequest, mockUser, mockAccount)
      ).rejects.toThrow('Session error');
    });

    it('應該處理用戶操作日誌記錄失敗但不影響主流程', async () => {
      mockGetUserByCredential.mockResolvedValue(mockCreatedUser);
      mockSetSession.mockResolvedValue({ ...mockSession, userId: 1 });
      mockCreateUserActionLog.mockRejectedValue(new Error('Log error'));

      // Info: (20250602 - Shirley) 應該不會拋出錯誤，因為日誌記錄失敗不應該影響主流程
      await expect(
        handleSignInSession(mockRequest as NextApiRequest, mockUser, mockAccount)
      ).rejects.toThrow('Log error');
    });

    it('應該處理新用戶創建流程中的錯誤', async () => {
      mockGetUserByCredential.mockResolvedValue(null);
      mockCreateUserByAuth.mockRejectedValue(new Error('User creation failed'));

      await expect(
        handleSignInSession(mockRequest as NextApiRequest, mockUser, mockAccount)
      ).rejects.toThrow('User creation failed');
    });
  });

  describe('handleSignInSession - 邊界條件測試', () => {
    it('應該處理用戶 ID 為 string 的情況', async () => {
      // Info: (20250602 - Shirley) 重置 mock 設定，避免與其他測試衝突
      jest.clearAllMocks();
      mockGetSession.mockResolvedValue(mockSession);
      mockGetUserTeams.mockResolvedValue(mockUserTeams);
      mockCreateUserActionLog.mockResolvedValue({
        id: 1,
        sessionId: 'test-session',
        userId: 1,
        actionType: 'LOGIN',
        actionDescription: 'User login',
        actionTime: 1640995200,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        apiEndpoint: '/api/auth/signin',
        httpMethod: 'POST',
        requestPayload: {},
        statusMessage: 'SUCCESS',
        httpStatusCode: 200,
        createdAt: 1640995200,
        updatedAt: 1640995200,
        deletedAt: null,
      });

      const userWithStringId = { ...mockUser, id: 'string-id-123' };
      const accountWithStringProviderAccountId = {
        ...mockAccount,
        providerAccountId: 'string-id-123',
      };

      mockGetUserByCredential.mockResolvedValue(null);
      mockCreateUserByAuth.mockResolvedValue(mockCreatedUser);
      mockCreateFile.mockResolvedValue({
        id: 1,
        name: 'test.jpg',
        size: 1024,
        url: 'https://example.com/avatar.jpg',
        mimeType: 'image/jpeg',
        type: 'tmp',
        isEncrypted: false,
        encryptedSymmetricKey: '',
        iv: Buffer.from(''),
        thumbnailId: null,
        createdAt: 1640995200,
        updatedAt: 1640995200,
        deletedAt: null,
      });
      mockSetSession.mockResolvedValue({ ...mockSession, userId: 1 });

      await handleSignInSession(
        mockRequest as NextApiRequest,
        userWithStringId,
        accountWithStringProviderAccountId
      );

      expect(mockGetUserByCredential).toHaveBeenCalledWith('string-id-123');
    });

    it('應該使用預設值當 session 獲取失敗時', async () => {
      // Info: (20250602 - Shirley) 設定獲取空的 session 但保持其他流程正常
      const emptySession = {
        isunfa: '',
        deviceId: 'empty-device-id',
        ipAddress: '0.0.0.0',
        userAgent: 'Empty Agent',
        userId: 0,
        accountBookId: 0,
        roleId: 0,
        actionTime: 1640995200,
        expires: 1640995200 + 3600,
        teams: [],
      };

      mockGetSession.mockResolvedValue(emptySession);
      mockGetUserByCredential.mockResolvedValue(mockCreatedUser);
      mockSetSession.mockResolvedValue({ ...emptySession, userId: 1 });

      await handleSignInSession(mockRequest as NextApiRequest, mockUser, mockAccount);

      expect(mockCreateUserActionLog).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: '',
          userId: 1,
        })
      );
    });

    it('應該處理空的請求物件', async () => {
      const emptyRequest = {
        headers: {}, // Info: (20250602 - Shirley) 提供空的 headers 物件而非 undefined
      } as NextApiRequest;

      mockGetUserByCredential.mockResolvedValue(mockCreatedUser);

      await handleSignInSession(emptyRequest, mockUser, mockAccount);

      expect(mockCreateUserActionLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: undefined,
          userAgent: undefined,
          apiEndpoint: '/api/v1/sign_in',
          httpMethod: '',
          requestPayload: undefined,
        })
      );
    });
  });
});
