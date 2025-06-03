import { getUserByCredential, createUserByAuth } from '@/lib/utils/repo/authentication.repo';
import { timestampInSeconds } from '@/lib/utils/common';

// Info: (20250602 - Shirley) Mock Prisma client
jest.mock('@/client', () => ({
  __esModule: true,
  default: {
    authentication: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Info: (20250602 - Shirley) Mock common utilities
jest.mock('@/lib/utils/common', () => ({
  timestampInSeconds: jest.fn(),
}));

// Deprecated: (20250603 - Luphia) remove eslint-disable
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockPrisma = require('@/client').default;

const mockTimestampInSeconds = jest.mocked(timestampInSeconds);

describe('Authentication Repository', () => {
  const mockTimestamp = 1640995200;
  const testCredentialId = 'test-credential-123';
  const testUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    imageFileId: 1,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    deletedAt: null,
    userAgreements: [],
  };

  const mockAuthentication = {
    id: 1,
    userId: 1,
    method: 'oauth',
    provider: 'google',
    credentialId: testCredentialId,
    authData: { test: 'data' },
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    user: testUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimestampInSeconds.mockReturnValue(mockTimestamp);
  });

  describe('getUserByCredential', () => {
    it('應該根據 credentialId 返回用戶資料', async () => {
      mockPrisma.authentication.findUnique.mockResolvedValue(mockAuthentication);

      const result = await getUserByCredential(testCredentialId);

      expect(mockPrisma.authentication.findUnique).toHaveBeenCalledWith({
        where: {
          credentialId: testCredentialId,
        },
        include: {
          user: {
            include: {
              userAgreements: true,
            },
          },
        },
      });
      expect(result).toEqual(mockAuthentication);
    });

    it('應該在找不到用戶時返回 null', async () => {
      mockPrisma.authentication.findUnique.mockResolvedValue(null);

      const result = await getUserByCredential(testCredentialId);

      expect(result).toBeNull();
    });

    it('應該在 credentialId 為空字串時返回 null', async () => {
      const result = await getUserByCredential('');

      expect(mockPrisma.authentication.findUnique).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('應該在 credentialId 只有空白字符時返回 null', async () => {
      const result = await getUserByCredential('   ');

      expect(mockPrisma.authentication.findUnique).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('應該處理資料庫錯誤', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.authentication.findUnique.mockRejectedValue(dbError);

      await expect(getUserByCredential(testCredentialId)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('createUserByAuth', () => {
    const createUserParams = {
      name: 'New User',
      credentialId: 'new-credential-456',
      method: 'oauth',
      provider: 'google',
      authData: { provider: 'google', id: 'google-123' },
      imageId: 2,
      email: 'newuser@example.com',
    };

    const expectedCreateData = {
      user: {
        create: {
          name: createUserParams.name,
          email: createUserParams.email,
          imageFile: {
            connect: {
              id: createUserParams.imageId,
            },
          },
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        },
      },
      method: createUserParams.method,
      provider: createUserParams.provider,
      credentialId: createUserParams.credentialId,
      authData: createUserParams.authData,
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
    };

    it('應該成功創建新用戶和認證記錄', async () => {
      const mockCreatedAuth = {
        ...mockAuthentication,
        credentialId: createUserParams.credentialId,
        user: {
          ...testUser,
          name: createUserParams.name,
          email: createUserParams.email,
        },
      };

      mockPrisma.authentication.create.mockResolvedValue(mockCreatedAuth);

      const result = await createUserByAuth(createUserParams);

      expect(mockPrisma.authentication.create).toHaveBeenCalledWith({
        data: expectedCreateData,
        include: {
          user: {
            include: {
              userAgreements: true,
            },
          },
        },
      });
      expect(result).toEqual(mockCreatedAuth);
    });

    it('應該正確處理時間戳', async () => {
      const customTimestamp = 1641000000;
      mockTimestampInSeconds.mockReturnValue(customTimestamp);

      const mockCreatedAuth = {
        ...mockAuthentication,
        createdAt: customTimestamp,
        updatedAt: customTimestamp,
      };

      mockPrisma.authentication.create.mockResolvedValue(mockCreatedAuth);

      await createUserByAuth(createUserParams);

      expect(mockTimestampInSeconds).toHaveBeenCalledWith(expect.any(Number));
      expect(mockPrisma.authentication.create).toHaveBeenCalledWith({
        data: {
          ...expectedCreateData,
          createdAt: customTimestamp,
          updatedAt: customTimestamp,
          user: {
            create: {
              ...expectedCreateData.user.create,
              createdAt: customTimestamp,
              updatedAt: customTimestamp,
            },
          },
        },
        include: {
          user: {
            include: {
              userAgreements: true,
            },
          },
        },
      });
    });

    it('應該處理沒有 email 的情況', async () => {
      const paramsWithoutEmail = {
        ...createUserParams,
        email: undefined,
      };

      const expectedDataWithoutEmail = {
        ...expectedCreateData,
        user: {
          create: {
            ...expectedCreateData.user.create,
            email: undefined,
          },
        },
      };

      mockPrisma.authentication.create.mockResolvedValue(mockAuthentication);

      await createUserByAuth(paramsWithoutEmail);

      expect(mockPrisma.authentication.create).toHaveBeenCalledWith({
        data: expectedDataWithoutEmail,
        include: {
          user: {
            include: {
              userAgreements: true,
            },
          },
        },
      });
    });

    it('應該處理資料庫創建錯誤', async () => {
      const dbError = new Error('Unique constraint violation');
      mockPrisma.authentication.create.mockRejectedValue(dbError);

      await expect(createUserByAuth(createUserParams)).rejects.toThrow(
        'Unique constraint violation'
      );
    });

    it('應該處理複雜的 authData 物件', async () => {
      const complexAuthData = {
        provider: 'google',
        id: 'google-123',
        email: 'test@gmail.com',
        verified_email: true,
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        locale: 'en',
      };

      const paramsWithComplexAuth = {
        ...createUserParams,
        authData: complexAuthData,
      };

      mockPrisma.authentication.create.mockResolvedValue(mockAuthentication);

      await createUserByAuth(paramsWithComplexAuth);

      expect(mockPrisma.authentication.create).toHaveBeenCalledWith({
        data: {
          ...expectedCreateData,
          authData: complexAuthData,
        },
        include: {
          user: {
            include: {
              userAgreements: true,
            },
          },
        },
      });
    });
  });

  describe('邊界條件和錯誤處理', () => {
    it('應該處理空的用戶名稱', async () => {
      const paramsWithEmptyName = {
        name: '',
        credentialId: 'test-credential',
        method: 'oauth',
        provider: 'google',
        authData: {},
        imageId: 1,
      };

      mockPrisma.authentication.create.mockResolvedValue(mockAuthentication);

      await createUserByAuth(paramsWithEmptyName);

      expect(mockPrisma.authentication.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user: {
            create: expect.objectContaining({
              name: '',
            }),
          },
        }),
        include: {
          user: {
            include: {
              userAgreements: true,
            },
          },
        },
      });
    });

    it('應該處理特殊字符的 credentialId', async () => {
      const specialCredentialId = 'user@domain.com#special-chars_123';

      // Info: (20250602 - Shirley) 重置 mock 並設定正確的返回值
      mockPrisma.authentication.findUnique.mockResolvedValue(null);

      const result = await getUserByCredential(specialCredentialId);

      expect(mockPrisma.authentication.findUnique).toHaveBeenCalledWith({
        where: {
          credentialId: specialCredentialId,
        },
        include: {
          user: {
            include: {
              userAgreements: true,
            },
          },
        },
      });
      expect(result).toBeNull();
    });
  });
});
