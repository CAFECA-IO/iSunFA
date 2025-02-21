import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v2/company/[companyId]/report/public/[reportId]/index';
import prisma from '@/client';
import { UserActionLogActionType } from '@/constants/user_action_log';

// Info: (20241127 - Murky) No Session to mimic public access
// jest.mock('../../../../../../../lib/utils/session.ts', () => ({
// getSession: jest.fn().mockResolvedValue({
// userId: 1001,
// companyId: 1000,
// roleId: 1001,
// cookie: {
//   httpOnly: false,
//   path: 'string',
//   secure: false,
// },
// }),
// }));

jest.mock('../../../../../../../../lib/utils/auth_check', () => ({
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
  jest.spyOn(prisma.userActionLog, 'create').mockResolvedValue({
    id: 1,
    sessionId: '1',
    userId: 1001,
    actionType: UserActionLogActionType.API,
    actionDescription: 'null',
    actionTime: Date.now(),
    ipAddress: '127.0.0.1',
    userAgent: 'null',
    apiEndpoint: 'null',
    httpMethod: 'GET',
    requestPayload: {},
    httpStatusCode: 200,
    statusMessage: 'null',
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('company/[companyId]/voucher/account/[accountId] integration test', () => {
  let req: jest.Mocked<NextApiRequest>;
  let res: jest.Mocked<NextApiResponse>;
  afterEach(() => {
    jest.clearAllMocks();
  });
  xdescribe('Get Public Report', () => {
    it('should return data match datatype', async () => {
      req = {
        headers: {},
        query: {
          reportId: '10000000',
        },
        method: 'GET',
        json: jest.fn(),
        body: {},
      } as unknown as jest.Mocked<NextApiRequest>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as jest.Mocked<NextApiResponse>;

      await handler(req, res);

      // Info: (20241105 - Murky) res.json的回傳值
      const apiResponse = res.json.mock.calls[0][0];
      expect(apiResponse.payload).toBeDefined();
    });
  });
});
