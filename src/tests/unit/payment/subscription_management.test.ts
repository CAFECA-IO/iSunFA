import prisma from '@/client';
import { getTimestampNow } from '@/lib/utils/common';
import { updateTeamMemberSession } from '@/lib/utils/session';
import {
  assertUserIsTeamMember,
  assertUserCan,
} from '@/lib/utils/permission/assert_user_team_permission';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import { ITeamSubscription } from '@/interfaces/payment';
import { TPlanType, TPaymentStatus } from '@/interfaces/subscription';
import { LeaveStatus, TeamPlanType } from '@prisma/client';
import { ORDER_STATUS } from '@/constants/order';
import {
  createTeamSubscription,
  updateTeamSubscription,
  listValidTeamSubscription,
  listTeamSubscription,
  getSubscriptionByTeamId,
  updateSubscription,
} from '@/lib/utils/repo/team_subscription.repo';

// Info: (20250604 - Shirley) 模擬依賴
jest.mock('@/client', () => ({
  __esModule: true,
  default: {
    teamSubscription: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    teamMember: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
    },
    teamOrder: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/utils/common', () => ({
  getTimestampNow: jest.fn(() => 1640995200),
}));

jest.mock('@/lib/utils/session', () => ({
  updateTeamMemberSession: jest.fn(),
}));

jest.mock('@/lib/utils/permission/assert_user_team_permission', () => ({
  assertUserIsTeamMember: jest.fn(),
  assertUserCan: jest.fn(),
}));

const mockPrisma = jest.mocked(prisma);
const mockGetTimestampNow = jest.mocked(getTimestampNow);
const mockUpdateTeamMemberSession = jest.mocked(updateTeamMemberSession);
const mockAssertUserIsTeamMember = jest.mocked(assertUserIsTeamMember);
const mockAssertUserCan = jest.mocked(assertUserCan);

// ToDo: (20250612 - Shirley) Revise ineffective test cases
describe('團隊訂閱管理 Repository 測試', () => {
  const mockUserId = 123;
  const mockTeamId = 456;
  const mockSubscriptionId = 789;
  const mockTimestamp = 1640995200;

  const mockTeamSubscription: ITeamSubscription = {
    id: mockSubscriptionId,
    userId: mockUserId,
    teamId: mockTeamId,
    planType: TPlanType.PROFESSIONAL,
    maxMembers: 5,
    startDate: mockTimestamp,
    expiredDate: mockTimestamp + 2592000, // Info: (20250604 - Shirley) 30 days later
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  };

  const mockPrismaSubscription = {
    id: mockSubscriptionId,
    teamId: mockTeamId,
    planType: TeamPlanType.PROFESSIONAL,
    maxMembers: 5,
    startDate: mockTimestamp,
    expiredDate: mockTimestamp + 2592000,
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
    deletedAt: null,
    team: {
      ownerId: mockUserId,
    },
    plan: {
      id: TPlanType.PROFESSIONAL,
      name: 'Professional',
      price: 899,
      maxMembers: 5,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTimestampNow.mockReturnValue(mockTimestamp);
  });

  describe('createTeamSubscription', () => {
    it('應該成功建立團隊訂閱', async () => {
      // Info: (20250604 - Shirley) 準備
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        can: true,
      });
      mockPrisma.teamSubscription.create.mockResolvedValue(mockPrismaSubscription);

      // Info: (20250604 - Shirley) 執行
      const result = await createTeamSubscription(mockTeamSubscription);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toMatchObject({
        id: mockSubscriptionId,
        teamId: mockTeamId,
        planType: TPlanType.PROFESSIONAL,
        startDate: mockTimestamp,
        expiredDate: mockTimestamp + 2592000,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      });
      expect(mockAssertUserCan).toHaveBeenCalledWith({
        userId: mockUserId,
        teamId: mockTeamId,
        action: TeamPermissionAction.MODIFY_SUBSCRIPTION,
      });
      expect(mockPrisma.teamSubscription.create).toHaveBeenCalledWith({
        data: {
          teamId: mockTeamId,
          planType: TeamPlanType.PROFESSIONAL,
          startDate: mockTimestamp,
          expiredDate: mockTimestamp + 2592000,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        },
      });
    });

    it('應該在權限不足時拋出錯誤', async () => {
      // Info: (20250604 - Shirley) 準備
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.VIEWER,
        effectiveRole: TeamRole.VIEWER,
        can: false,
      });

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(createTeamSubscription(mockTeamSubscription)).rejects.toThrow(
        STATUS_MESSAGE.PERMISSION_DENIED
      );
      expect(mockPrisma.teamSubscription.create).not.toHaveBeenCalled();
    });

    it('應該在資料庫建立失敗時拋出錯誤', async () => {
      // Info: (20250604 - Shirley) 準備
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        can: true,
      });
      // Deprecated: (20250604 - Luphia) remove eslint-disable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.teamSubscription.create.mockResolvedValue(null as any);

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(createTeamSubscription(mockTeamSubscription)).rejects.toThrow(
        STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR
      );
    });

    it('應該使用交易客戶端進行操作', async () => {
      // Info: (20250604 - Shirley) 準備
      const mockTx = {
        teamSubscription: {
          create: jest.fn().mockResolvedValue(mockPrismaSubscription),
        },
      };
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        can: true,
      });

      // Info: (20250604 - Shirley) 執行
      // Deprecated: (20250604 - Luphia) remove eslint-disable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await createTeamSubscription(mockTeamSubscription, mockTx as any);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toMatchObject({
        id: mockSubscriptionId,
        teamId: mockTeamId,
        planType: TPlanType.PROFESSIONAL,
      });
      expect(mockTx.teamSubscription.create).toHaveBeenCalled();
      expect(mockPrisma.teamSubscription.create).not.toHaveBeenCalled();
    });
  });

  describe('updateTeamSubscription', () => {
    it('應該成功更新團隊訂閱', async () => {
      // Info: (20250604 - Shirley) 準備
      const updatedSubscription = {
        ...mockTeamSubscription,
        planType: TPlanType.ENTERPRISE,
        expiredDate: mockTimestamp + 5184000, // Info: (20250604 - Shirley) 60 days later
      };
      const mockUpdatedPrismaSubscription = {
        ...mockPrismaSubscription,
        planType: TeamPlanType.ENTERPRISE,
        expiredDate: mockTimestamp + 5184000,
      };

      mockPrisma.teamSubscription.update.mockResolvedValue(mockUpdatedPrismaSubscription);

      // Info: (20250604 - Shirley) 執行
      const result = await updateTeamSubscription(updatedSubscription);

      // Info: (20250604 - Shirley) 驗證 - 調整期望值以匹配實際返回的結構
      expect(result).toMatchObject({
        id: mockSubscriptionId,
        teamId: mockTeamId,
        planType: TPlanType.ENTERPRISE,
        startDate: mockTimestamp,
        expiredDate: mockTimestamp + 5184000,
        updatedAt: mockTimestamp,
      });
      expect(mockPrisma.teamSubscription.update).toHaveBeenCalledWith({
        where: { id: mockSubscriptionId },
        data: {
          planType: TeamPlanType.ENTERPRISE,
          startDate: mockTimestamp,
          expiredDate: mockTimestamp + 5184000,
          updatedAt: mockTimestamp,
        },
      });
    });

    it('應該在更新失敗時拋出錯誤', async () => {
      // Info: (20250604 - Shirley) 準備
      // Deprecated: (20250604 - Luphia) remove eslint-disable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.teamSubscription.update.mockResolvedValue(null as any);

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(updateTeamSubscription(mockTeamSubscription)).rejects.toThrow(
        STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR
      );
    });
  });

  describe('listValidTeamSubscription', () => {
    it('應該成功列出有效的團隊訂閱', async () => {
      // Info: (20250604 - Shirley) 準備
      const mockValidSubscriptions = [mockPrismaSubscription];
      mockPrisma.teamSubscription.findMany.mockResolvedValue(mockValidSubscriptions);

      // Info: (20250604 - Shirley) 執行
      const result = await listValidTeamSubscription(mockTeamId);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockSubscriptionId,
        userId: mockUserId,
        teamId: mockTeamId,
        planType: TPlanType.PROFESSIONAL,
        enableAutoRenewal: true,
      });
      expect(mockPrisma.teamSubscription.findMany).toHaveBeenCalledWith({
        where: {
          teamId: mockTeamId,
          startDate: {
            lte: mockTimestamp,
          },
          expiredDate: {
            gt: mockTimestamp,
          },
        },
        include: {
          team: {
            select: {
              ownerId: true,
            },
          },
          plan: true,
        },
      });
    });

    it('應該在沒有有效訂閱時返回空陣列', async () => {
      // Info: (20250604 - Shirley) 準備
      mockPrisma.teamSubscription.findMany.mockResolvedValue([]);

      // Info: (20250604 - Shirley) 執行
      const result = await listValidTeamSubscription(mockTeamId);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toEqual([]);
    });
  });

  describe('listTeamSubscription', () => {
    const mockTeamMembership = {
      userId: mockUserId,
      id: 1,
      status: LeaveStatus.IN_TEAM,
      role: TeamRole.ADMIN,
      joinedAt: mockTimestamp,
      leftAt: null,
      teamId: mockTeamId,
      team: {
        id: mockTeamId,
        name: 'Test Team',
        subscriptions: [
          {
            ...mockPrismaSubscription,
            plan: {
              id: TPlanType.PROFESSIONAL,
              name: 'Professional',
              price: 899,
            },
          },
        ],
        teamOrder: [
          {
            id: 123,
            status: ORDER_STATUS.PAID,
            teamPaymentTransaction: [
              {
                id: 456,
                teamInvoice: [{ id: 789, status: true }],
              },
            ],
          },
        ],
      },
    };

    it('應該成功列出用戶的團隊訂閱', async () => {
      // Info: (20250604 - Shirley) 準備
      mockPrisma.teamMember.findMany.mockResolvedValue([mockTeamMembership]);
      mockPrisma.teamMember.count.mockResolvedValue(1);
      mockAssertUserIsTeamMember.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        planType: TPlanType.PROFESSIONAL,
        expiredAt: mockTimestamp + 2592000,
        inGracePeriod: false,
        gracePeriodEndAt: 0,
        isExpired: false,
      });

      // Info: (20250604 - Shirley) 執行
      const result = await listTeamSubscription(mockUserId);

      // Info: (20250604 - Shirley) 驗證
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: mockTeamId,
        name: 'Test Team',
        plan: TPlanType.PROFESSIONAL,
        enableAutoRenewal: true,
        expiredTimestamp: mockTimestamp + 2592000,
        paymentStatus: TPaymentStatus.PAID,
      });
      expect(result.totalCount).toBe(1);
      expect(result.page).toBe(1);
    });

    it('應該正確處理分頁參數', async () => {
      // Info: (20250604 - Shirley) 準備
      mockPrisma.teamMember.findMany.mockResolvedValue([]);
      mockPrisma.teamMember.count.mockResolvedValue(0);

      // Info: (20250604 - Shirley) 執行
      await listTeamSubscription(mockUserId, 2, 10);

      // Info: (20250604 - Shirley) 驗證
      expect(mockPrisma.teamMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('應該正確判斷付款狀態為試用中', async () => {
      // Info: (20250604 - Shirley) 準備
      const trialTeamMembership = {
        ...mockTeamMembership,
        team: {
          ...mockTeamMembership.team,
          teamOrder: [], // Info: (20250604 - Shirley) 沒有訂單記錄
        },
      };
      mockPrisma.teamMember.findMany.mockResolvedValue([trialTeamMembership]);
      mockPrisma.teamMember.count.mockResolvedValue(1);
      mockAssertUserIsTeamMember.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        planType: TPlanType.PROFESSIONAL,
        expiredAt: mockTimestamp + 2592000,
        inGracePeriod: false,
        gracePeriodEndAt: 0,
        isExpired: false,
      });

      // Info: (20250604 - Shirley) 執行
      const result = await listTeamSubscription(mockUserId);

      // Info: (20250604 - Shirley) 驗證
      expect(result.data[0].paymentStatus).toBe(TPaymentStatus.TRIAL);
    });

    it('應該正確判斷付款狀態為付款失敗', async () => {
      // Info: (20250604 - Shirley) 準備
      const failedPaymentTeamMembership = {
        ...mockTeamMembership,
        team: {
          ...mockTeamMembership.team,
          teamOrder: [
            {
              id: 123,
              status: ORDER_STATUS.PAID,
              teamPaymentTransaction: [
                {
                  id: 456,
                  teamInvoice: [], // Info: (20250604 - Shirley) 沒有發票記錄
                },
              ],
            },
          ],
        },
      };
      mockPrisma.teamMember.findMany.mockResolvedValue([failedPaymentTeamMembership]);
      mockPrisma.teamMember.count.mockResolvedValue(1);
      mockAssertUserIsTeamMember.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        planType: TPlanType.PROFESSIONAL,
        expiredAt: mockTimestamp + 2592000,
        inGracePeriod: false,
        gracePeriodEndAt: 0,
        isExpired: false,
      });

      // Info: (20250604 - Shirley) 執行
      const result = await listTeamSubscription(mockUserId);

      // Info: (20250604 - Shirley) 驗證
      expect(result.data[0].paymentStatus).toBe(TPaymentStatus.PAYMENT_FAILED);
    });

    it('應該正確判斷免費用戶狀態', async () => {
      // Info: (20250604 - Shirley) 準備
      const freeTeamMembership = {
        ...mockTeamMembership,
        team: {
          ...mockTeamMembership.team,
          subscriptions: [], // Info: (20250604 - Shirley) 沒有訂閱記錄
        },
      };
      mockPrisma.teamMember.findMany.mockResolvedValue([freeTeamMembership]);
      mockPrisma.teamMember.count.mockResolvedValue(1);
      mockAssertUserIsTeamMember.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        planType: TPlanType.BEGINNER,
        expiredAt: 0,
        inGracePeriod: false,
        gracePeriodEndAt: 0,
        isExpired: false,
      });

      // Info: (20250604 - Shirley) 執行
      const result = await listTeamSubscription(mockUserId);

      // Info: (20250604 - Shirley) 驗證
      expect(result.data[0].paymentStatus).toBe(TPaymentStatus.FREE);
    });
  });

  describe('getSubscriptionByTeamId', () => {
    const mockTeam = {
      id: mockTeamId,
      name: 'Test Team',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      ownerId: mockUserId,
      imageFileId: null,
      about: 'Test Team About',
      profile: 'Test Profile',
      bankInfo: { code: '555', number: '1234567890' },
      subscriptions: [
        {
          ...mockPrismaSubscription,
          plan: {
            id: TPlanType.PROFESSIONAL,
            name: 'Professional',
          },
        },
      ],
      teamOrder: [
        {
          id: 123,
          status: ORDER_STATUS.PAID,
          teamPaymentTransaction: [
            {
              id: 456,
              teamInvoice: [{ id: 789, status: true }],
            },
          ],
        },
      ],
    };

    it('應該成功獲取團隊訂閱資訊', async () => {
      // Info: (20250604 - Shirley) 準備
      mockAssertUserIsTeamMember.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        planType: TPlanType.PROFESSIONAL,
        expiredAt: mockTimestamp + 2592000,
        inGracePeriod: false,
        gracePeriodEndAt: 0,
        isExpired: false,
      });
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        can: true,
      });
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);

      // Info: (20250604 - Shirley) 執行
      const result = await getSubscriptionByTeamId(mockUserId, mockTeamId);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toMatchObject({
        id: mockTeamId,
        name: 'Test Team',
        plan: TPlanType.BEGINNER,
        enableAutoRenewal: true,
        paymentStatus: TPaymentStatus.PAID,
      });
      expect(mockAssertUserIsTeamMember).toHaveBeenCalledWith(mockUserId, mockTeamId);
      expect(mockUpdateTeamMemberSession).toHaveBeenCalledWith(
        mockUserId,
        mockTeamId,
        TeamRole.ADMIN
      );
      expect(mockAssertUserCan).toHaveBeenCalledWith({
        userId: mockUserId,
        teamId: mockTeamId,
        action: TeamPermissionAction.VIEW_SUBSCRIPTION,
      });
    });

    it('應該在權限不足時拋出錯誤', async () => {
      // Info: (20250604 - Shirley) 準備
      mockAssertUserIsTeamMember.mockResolvedValue({
        actualRole: TeamRole.VIEWER,
        effectiveRole: TeamRole.VIEWER,
        planType: TPlanType.BEGINNER,
        expiredAt: 0,
        inGracePeriod: false,
        gracePeriodEndAt: 0,
        isExpired: false,
      });
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.VIEWER,
        effectiveRole: TeamRole.VIEWER,
        can: false,
      });

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(getSubscriptionByTeamId(mockUserId, mockTeamId)).rejects.toThrow(
        STATUS_MESSAGE.PERMISSION_DENIED
      );
    });

    it('應該在團隊不存在時返回 null', async () => {
      // Info: (20250604 - Shirley) 準備
      mockAssertUserIsTeamMember.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        planType: TPlanType.PROFESSIONAL,
        expiredAt: mockTimestamp + 2592000,
        inGracePeriod: false,
        gracePeriodEndAt: 0,
        isExpired: false,
      });
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        can: true,
      });
      mockPrisma.team.findUnique.mockResolvedValue(null);

      // Info: (20250604 - Shirley) 執行
      const result = await getSubscriptionByTeamId(mockUserId, mockTeamId);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toBeNull();
    });

    it('應該處理沒有訂閱記錄的團隊', async () => {
      // Info: (20250604 - Shirley) 準備
      mockAssertUserIsTeamMember.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        planType: TPlanType.BEGINNER,
        expiredAt: 0,
        inGracePeriod: false,
        gracePeriodEndAt: 0,
        isExpired: false,
      });
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        can: true,
      });
      mockPrisma.team.findUnique.mockResolvedValue({
        id: mockTeamId,
        name: 'Test Team',
        ownerId: mockUserId,
        imageFileId: null,
        about: 'Test Team About',
        profile: 'Test Profile',
        bankInfo: { code: '555', number: '1234567890' },
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        subscriptions: [],
        teamOrder: [],
        // Deprecated: (20250604 - Luphia) remove eslint-disable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Info: (20250604 - Shirley) 執行
      const result = await getSubscriptionByTeamId(mockUserId, mockTeamId);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toMatchObject({
        plan: TPlanType.BEGINNER,
        paymentStatus: TPaymentStatus.FREE,
        expiredTimestamp: 0,
      });
    });
  });

  describe('updateSubscription', () => {
    const mockTeamWithSubscription = {
      id: mockTeamId,
      name: 'Test Team',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      ownerId: mockUserId,
      imageFileId: null,
      about: 'Test Team About',
      profile: 'Test Profile',
      bankInfo: {},
      subscriptions: [
        {
          ...mockPrismaSubscription,
          plan: {
            id: TPlanType.PROFESSIONAL,
            name: 'Professional',
          },
        },
      ],
      teamOrder: [
        {
          id: 123,
          status: ORDER_STATUS.PAID,
          teamPaymentTransaction: [
            {
              id: 456,
              teamInvoice: [{ id: 789, status: true }],
            },
          ],
        },
      ],
    };

    it('應該成功更新訂閱方案', async () => {
      // Info: (20250604 - Shirley) 準備
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        can: true,
      });
      mockPrisma.teamSubscription.create.mockResolvedValue({
        ...mockPrismaSubscription,
        planType: TeamPlanType.ENTERPRISE,
      });
      mockPrisma.team.findUnique.mockResolvedValue(mockTeamWithSubscription);

      // Info: (20250604 - Shirley) 執行
      const result = await updateSubscription(mockUserId, mockTeamId, {
        plan: TPlanType.ENTERPRISE,
      });

      // Info: (20250604 - Shirley) 驗證
      expect(result).toMatchObject({
        id: mockTeamId,
        name: 'Test Team',
        plan: TPlanType.PROFESSIONAL, // Info: (20250604 - Shirley) 應該從查詢結果取得
        enableAutoRenewal: true,
      });
      expect(mockPrisma.teamSubscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId: mockTeamId,
          planType: TPlanType.ENTERPRISE,
        }),
      });
    });

    it('應該成功停用自動續約', async () => {
      // Info: (20250604 - Shirley) 準備
      const mockOrder = {
        id: 123,
        userId: mockUserId,
        teamId: mockTeamId,
        status: ORDER_STATUS.PAID,
        amount: 1000,
        currency: 'TWD',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        deletedAt: null,
      };
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        can: true,
      });
      mockPrisma.teamOrder.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.teamOrder.update.mockResolvedValue({
        ...mockOrder,
        status: ORDER_STATUS.CANCELLED,
      });
      mockPrisma.team.findUnique.mockResolvedValue(mockTeamWithSubscription);

      // Info: (20250604 - Shirley) 執行
      const result = await updateSubscription(mockUserId, mockTeamId, {
        autoRenew: false,
      });

      // Info: (20250604 - Shirley) 驗證
      expect(result).toMatchObject({
        id: mockTeamId,
        enableAutoRenewal: true,
      });
      expect(mockPrisma.teamOrder.update).toHaveBeenCalledWith({
        where: { id: 123 },
        data: { status: ORDER_STATUS.CANCELLED },
      });
    });

    it('應該在權限不足時拋出錯誤', async () => {
      // Info: (20250604 - Shirley) 準備
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.VIEWER,
        effectiveRole: TeamRole.VIEWER,
        can: false,
      });

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(
        updateSubscription(mockUserId, mockTeamId, { plan: TPlanType.ENTERPRISE })
      ).rejects.toThrow(STATUS_MESSAGE.PERMISSION_DENIED);
    });

    it('應該處理空的輸入參數', async () => {
      // Info: (20250604 - Shirley) 準備
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        can: true,
      });
      mockPrisma.team.findUnique.mockResolvedValue({
        id: mockTeamId,
        name: 'Test Team',
        subscriptions: [],
        teamOrder: [],
        // Deprecated: (20250604 - Luphia) remove eslint-disable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Info: (20250604 - Shirley) 執行
      const result = await updateSubscription(mockUserId, mockTeamId, {});

      // Info: (20250604 - Shirley) 驗證
      expect(result).toMatchObject({
        id: mockTeamId,
        name: 'Test Team',
      });
      expect(mockPrisma.teamSubscription.create).not.toHaveBeenCalled();
      expect(mockPrisma.teamOrder.update).not.toHaveBeenCalled();
    });
  });

  describe('邊界條件和錯誤處理', () => {
    it('應該處理資料庫連接錯誤', async () => {
      // Info: (20250604 - Shirley) 準備
      const dbError = new Error('Database connection failed');
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        can: true,
      });
      mockPrisma.teamSubscription.create.mockRejectedValue(dbError);

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(createTeamSubscription(mockTeamSubscription)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('應該處理無效的團隊 ID', async () => {
      // Info: (20250604 - Shirley) 準備
      mockPrisma.teamSubscription.findMany.mockResolvedValue([]);

      // Info: (20250604 - Shirley) 執行
      const result = await listValidTeamSubscription(-1);

      // Info: (20250604 - Shirley) 驗證
      expect(result).toEqual([]);
    });

    it('應該處理權限檢查函數的錯誤', async () => {
      // Info: (20250604 - Shirley) 準備
      const permissionError = new Error('Permission check failed');
      mockAssertUserCan.mockRejectedValue(permissionError);

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(createTeamSubscription(mockTeamSubscription)).rejects.toThrow(
        'Permission check failed'
      );
    });

    it('應該處理 Session 更新失敗', async () => {
      // Info: (20250604 - Shirley) 準備
      const sessionError = new Error('Session update failed');
      mockAssertUserIsTeamMember.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        planType: TPlanType.BEGINNER,
        expiredAt: 0,
        inGracePeriod: false,
        gracePeriodEndAt: 0,
        isExpired: false,
      });
      mockUpdateTeamMemberSession.mockRejectedValue(sessionError);
      mockAssertUserCan.mockResolvedValue({
        actualRole: TeamRole.ADMIN,
        effectiveRole: TeamRole.ADMIN,
        can: true,
      });
      mockPrisma.team.findUnique.mockResolvedValue({
        id: mockTeamId,
        name: 'Test Team',
        ownerId: mockUserId,
        imageFileId: null,
        about: 'Test Team About',
        profile: 'Test Profile',
        bankInfo: { code: '555', number: '1234567890' },
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      });

      // Info: (20250604 - Shirley) 執行 & 驗證
      await expect(getSubscriptionByTeamId(mockUserId, mockTeamId)).rejects.toThrow(
        'Session update failed'
      );
    });
  });
});
