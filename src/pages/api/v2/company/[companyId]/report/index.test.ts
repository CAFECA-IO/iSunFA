import { NextApiRequest, NextApiResponse } from 'next';
import { handleGetRequest } from '@/pages/api/v2/company/[companyId]/report/index';
import { STATUS_MESSAGE } from '@/constants/status_code';

import { FinancialReportTypesKey } from '@/interfaces/report_type';

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

// Info: (20241007 - Murky) Uncomment this to check zod return
// jest.mock('../../../../../../lib/utils/logger_back', () => ({
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

describe('company/[companyId]/certificate', () => {
  describe('GET Certificate List', () => {
    it('should match patter', async () => {
      req.query = {
        startDate: '10000000',
        endDate: '16000000',
        language: 'zh',
        reportType: FinancialReportTypesKey.balance_sheet,
      };

      const { payload, statusMessage } = await handleGetRequest(req, res);

      expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_GET);
      expect(payload).toBeDefined();
    });
  });
});
