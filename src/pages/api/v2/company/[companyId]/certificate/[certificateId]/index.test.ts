import { NextApiRequest, NextApiResponse } from 'next';
import { handleGetRequest } from '@/pages/api/v2/company/[companyId]/certificate/[certificateId]/index';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { certificateReturnValidator } from '@/lib/utils/zod_schema/certificate';

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

jest.mock('../../../../../../../lib/utils/logger_back', () => ({
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

describe('company/[companyId]/certificate/[certificateId]', () => {
  describe('GET Certificate List', () => {
    it('should match patter', async () => {
      req.query = {
        certificateId: '1',
      };
      req.body = {};

      const { payload, statusMessage } = await handleGetRequest(req, res);

      const parseData = certificateReturnValidator.safeParse(payload);

      expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_LIST);
      expect(parseData.success).toBe(true);
    });
  });
});
