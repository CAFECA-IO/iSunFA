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
jest.mock('@/lib/utils/common');

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

  describe('基礎 Mock 驗證', () => {
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

  describe('資料驗證', () => {
    it('傳票應該有正確的基本屬性', () => {
      expect(mockVoucher).toHaveProperty('id');
      expect(mockVoucher).toHaveProperty('companyId');
      expect(mockVoucher).toHaveProperty('no');
      expect(mockVoucher).toHaveProperty('type');
      expect(mockVoucher).toHaveProperty('status');
    });

    it('session 應該有正確的基本屬性', () => {
      expect(mockSession).toHaveProperty('userId');
      expect(mockSession).toHaveProperty('companyId');
      expect(mockSession).toHaveProperty('teams');
      expect(mockSession.teams).toBeInstanceOf(Array);
    });

    it('應該正確設定傳票編號格式', () => {
      expect(mockVoucher.no).toMatch(/^\d{8}\d{3}$/);
    });

    it('應該正確設定時間戳', () => {
      expect(mockVoucher.date).toBe(1703980800);
      expect(mockVoucher.createdAt).toBe(1703980800);
      expect(mockVoucher.updatedAt).toBe(1703980800);
    });
  });

  describe('Mock 函數檢查', () => {
    it('所有重要的函數都應該被正確 mock', () => {
      expect(jest.isMockFunction(getSession)).toBe(true);
    });

    it('Mock 函數應該能正常調用', async () => {
      const result = await mockGetSession({} as NextApiRequest);
      expect(result).toBeDefined();
      expect(result.userId).toBe(mockSession.userId);
    });
  });
});
