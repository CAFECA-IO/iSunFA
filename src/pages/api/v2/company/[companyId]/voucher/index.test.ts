import {
  handleGetRequest,
  handlePostRequest,
} from '@/pages/api/v2/company/[companyId]/voucher/index';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { VoucherV2Action } from '@/constants/voucher';
import { EventType } from '@/constants/account';

jest.mock('../../../../../../lib/utils/session.ts', () => ({
  getSession: jest.fn().mockResolvedValue({
    userId: 1001,
    companyId: 1001,
  }),
}));

jest.mock('../../../../../../lib/utils/auth_check', () => ({
  checkAuthorization: jest.fn().mockResolvedValue(true),
}));

// Info: (20240927 - Murky) Comment if you want to check validateRequest related info
jest.mock('../../../../../../lib/utils/logger_back', () => ({
  loggerRequest: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
  }),
}));

beforeEach(() => {});

afterEach(() => {
  jest.clearAllMocks();
});

describe('company/[companyId]/voucher', () => {
  describe('GET Voucher List', () => {
    it('should pass', async () => {
      const query = {
        pageSize: 1,
        strategy: 'upcoming' as 'upcoming' | 'uploaded' | 'payment' | 'receiving',
        page: 1,
        startDate: 1,
        endDate: 1,
      };
      const body = {};
      const session = {
        userId: 1001,
        companyId: 1001,
        roleId: 1001,
        cookie: {
          httpOnly: false,
          path: 'string',
          secure: false,
        },
      };

      const { statusMessage } = await handleGetRequest({
        query,
        body,
        session,
      });

      expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_LIST);
    });
  });

  describe('POST Voucher', () => {
    it('should pass', async () => {
      const query = {};
      const body = {
        actions: [VoucherV2Action.ADD_ASSET],
        certificateIds: [1001, 1002],
        voucherDate: 10000000,
        type: EventType.PAYMENT,
        note: 'this is note',
        counterPartyId: 1001,
        lineItems: [
          { accountId: 1001, description: 'this is for Particulars', debit: true, amount: 1000 },
          { accountId: 1002, description: 'this is for Particulars', debit: false, amount: 1000 },
        ],
        recurringEntry: {
          type: 'month',
          startDate: 1000000,
          endDate: 1000100,
          daysOfWeek: [0, 1, 2],
          daysOfMonth: [1, 15, 30],
          daysOfYears: [
            {
              month: 1,
              day: 1,
            },
            {
              month: 12,
              day: 25,
            },
          ],
        },
        assetIds: [1001],
        reverseVouchers: [
          {
            voucherId: 1003,
            amount: 500,
          },
        ],
      };

      const session = {
        userId: 1001,
        companyId: 1001,
        roleId: 1001,
        cookie: {
          httpOnly: false,
          path: 'string',
          secure: false,
        },
      };
      const { statusMessage } = await handlePostRequest({
        query,
        body,
        session,
      });

      expect(statusMessage).toBe(STATUS_MESSAGE.CREATED);
    });
  });
});
