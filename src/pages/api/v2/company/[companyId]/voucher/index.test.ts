import { NextApiRequest, NextApiResponse } from 'next';
import {
  handleGetRequest,
  handlePostRequest,
} from '@/pages/api/v2/company/[companyId]/voucher/index';
import { STATUS_MESSAGE } from '@/constants/status_code';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

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

beforeEach(() => {
  req = {
    headers: {},
    query: {},
    method: '',
    socket: {},
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('company/[companyId]/voucher', () => {
  describe('GET Voucher List', () => {
    it('should pass', async () => {
      req.query = {
        strategy: 'upcoming',
        page: '1',
        pageSize: '8',
      };
      req.body = {};

      const { statusMessage } = await handleGetRequest(req, res);

      expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_LIST);
    });
  });

  describe('POST Voucher', () => {
    it('should pass', async () => {
      req.query = {};
      req.body = {
        certificateIds: [1001, 1002],
        voucherDate: 10000000,
        type: 'payment',
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
      const { statusMessage } = await handlePostRequest(req, res);

      expect(statusMessage).toBe(STATUS_MESSAGE.CREATED);
    });
  });
});
