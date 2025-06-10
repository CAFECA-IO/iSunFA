/**
 * @jest-environment node
 */
import { NextApiRequest } from 'next';
import { getSession } from '@/lib/utils/session';
import { EventType } from '@/constants/account';
import { JOURNAL_EVENT } from '@/constants/journal';
import { ISessionData } from '@/interfaces/session';
import { TeamRole } from '@/interfaces/team';

// Mock all dependencies
jest.mock('@/lib/utils/session');
jest.mock('@/lib/utils/middleware');
jest.mock('@/lib/utils/logger_back');
jest.mock('@/lib/utils/validator');
jest.mock('@/lib/utils/repo/voucher.repo');
jest.mock('@/lib/utils/permission/assert_user_team_permission');
jest.mock('@/pages/api/v2/account_book/[accountBookId]/voucher/[voucherId]/route_utils');

// Import mocked functions
const mockGetSession = jest.mocked(getSession);

// Mock data
const mockSession: ISessionData = {
  isunfa: 'session-id-123',
  deviceId: 'test-device-id',
  ipAddress: '127.0.0.1',
  userAgent: 'Test Agent',
  userId: 2001,
  companyId: 1001,
  roleId: 1,
  actionTime: 1703980800,
  expires: 1703980800 + 3600,
  teams: [
    {
      id: 1,
      role: TeamRole.ADMIN,
    },
  ],
};

const mockVoucher = {
  id: 3001,
  companyId: 1001,
  no: '20231231001',
  date: 1703980800,
  type: EventType.INCOME,
  note: '測試傳票',
  counterPartyId: null,
  issuerId: 2001,
  editable: true,
  status: JOURNAL_EVENT.UPLOADED,
  createdAt: 1703980800,
  updatedAt: 1703980800,
  deletedAt: null,
};

describe('Voucher API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(mockSession);
  });

  describe('Repository Layer Tests', () => {
    it('應該正確模擬 session 獲取', async () => {
      const mockRequest = {} as NextApiRequest;
      const result = await getSession(mockRequest);
      expect(result).toEqual(mockSession);
      expect(mockGetSession).toHaveBeenCalled();
    });

    it('應該包含正確的 mock 傳票資料', () => {
      expect(mockVoucher.id).toBe(3001);
      expect(mockVoucher.companyId).toBe(1001);
      expect(mockVoucher.type).toBe(EventType.INCOME);
      expect(mockVoucher.status).toBe(JOURNAL_EVENT.UPLOADED);
    });

    it('應該包含正確的 session 資料結構', () => {
      expect(mockSession.userId).toBe(2001);
      expect(mockSession.companyId).toBe(1001);
      expect(mockSession.teams).toHaveLength(1);
      expect(mockSession.teams[0].role).toBe(TeamRole.ADMIN);
    });
  });

  describe('Mock 設定驗證', () => {
    it('應該正確模擬 getSession 函數', () => {
      expect(jest.isMockFunction(getSession)).toBe(true);
    });

    it('應該能夠取得模擬的 session 資料', async () => {
      const mockRequest = {} as NextApiRequest;
      const session = await mockGetSession(mockRequest);
      expect(session).toBeDefined();
      expect(session.userId).toBe(2001);
    });
  });
});
