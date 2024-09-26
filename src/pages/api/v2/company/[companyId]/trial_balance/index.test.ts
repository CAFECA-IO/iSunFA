import { NextApiRequest, NextApiResponse } from 'next';
import { handleGetRequest } from '@/pages/api/v2/company/[companyId]/trial_balance/index';
import { STATUS_MESSAGE } from '@/constants/status_code';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

jest.mock('../../../../../../lib/utils/session.ts', () => ({
  getSession: jest.fn().mockResolvedValue({
    userId: 1001,
    companyId: 1001,
  }),
}));

jest.mock('../../../../../../lib/utils/request_validator', () => ({
  validateRequest: jest.fn().mockReturnValue({
    query: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      page: 1,
      pageSize: 10,
      sortOrder: 'asc',
    },
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

describe('company/[companyId]/trial_balance', () => {
  describe('GET Trial Balance List', () => {
    it('should return trial balance list', async () => {
      req.query = {
        companyId: '1001',
      };

      const { payload, statusMessage } = await handleGetRequest(req, res);

      expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_LIST);
      expect(payload).toHaveProperty('currency', 'TWD');
      expect(payload).toHaveProperty('items');
      if (payload && 'items' in payload) {
        expect(payload.items).toHaveProperty('data');

        const items = payload.items as { data?: unknown[] };
        expect(items).toHaveProperty('data');
        if ('data' in items) {
          expect(items.data).toBeInstanceOf(Array);
        }
      }
      expect(payload).toHaveProperty('total');
      if (payload && 'total' in payload) {
        expect(payload.total).toHaveProperty('beginningCreditAmount');
        expect(payload.total).toHaveProperty('beginningDebitAmount');
        expect(payload.total).toHaveProperty('midtermCreditAmount');
      }
    });
  });
});
