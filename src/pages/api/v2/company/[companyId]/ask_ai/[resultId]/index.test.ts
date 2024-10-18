import { NextApiRequest, NextApiResponse } from 'next';
import { handleGetRequest } from '@/pages/api/v2/company/[companyId]/ask_ai/[resultId]/index';
import { STATUS_MESSAGE } from '@/constants/status_code';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

jest.mock('../../../../../../../lib/utils/session.ts', () => ({
  getSession: jest.fn().mockResolvedValue({
    userId: 1001,
    companyId: 1001,
  }),
}));

jest.mock('../../../../../../../lib/utils/auth_check', () => ({
  checkAuthorization: jest.fn().mockResolvedValue(true),
}));

// Info: (20240927 - Murky) Comment if you want to check validateRequest related info
// jest.mock('../../../../../../../lib/utils/logger_back', () => ({
//   loggerRequest: jest.fn().mockReturnValue({
//     info: jest.fn(),
//     error: jest.fn(),
//   }),
// }));

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

describe('company/[companyId]/ask_ai/[resultId]', () => {
  describe('GET result One', () => {
    it('should get certificate', async () => {
      req.query = {
        reason: 'certificate',
        resultId: '1',
      };

      const { statusMessage } = await handleGetRequest(req, res);

      expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_GET);
    });

    it('should get voucher', async () => {
      req.query = {
        reason: 'voucher',
        resultId: '1',
      };

      const { statusMessage } = await handleGetRequest(req, res);

      expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_GET);
    });
  });
});
