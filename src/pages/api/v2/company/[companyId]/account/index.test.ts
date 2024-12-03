import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v2/company/[companyId]/account/index';
import prisma from '@/client';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { accountGetV2Schema } from '@/lib/utils/zod_schema/account';

jest.mock('../../../../../../lib/utils/session.ts', () => ({
  getSession: jest.fn().mockResolvedValue({
    userId: 1000,
    companyId: 1000,
  }),
}));

jest.mock('../../../../../../lib/utils/auth_check', () => ({
  checkAuthorization: jest.fn().mockResolvedValue(true),
}));

// jest.mock('../../../../../../lib/utils/logger_back', () => ({
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
    createdAt: 123456789,
    updatedAt: 123456789,
    deletedAt: null,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('company/[companyId]/account integration test', () => {
  let req: jest.Mocked<NextApiRequest>;
  let res: jest.Mocked<NextApiResponse>;
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('Get list certificate', () => {
    it('should return data match frontend validator', async () => {
      req = {
        headers: {},
        query: {
          page: '1',
          pageSize: '10',
          includeDefaultAccount: 'true',
          forUser: 'true',
          sortBy: 'code',
        },
        method: 'GET',
        json: jest.fn(),
        body: {},
      } as unknown as jest.Mocked<NextApiRequest>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as jest.Mocked<NextApiResponse>;

      const outputValidator = accountGetV2Schema.frontend;

      await handler(req, res);

      // Info: (20241105 - Murky) res.json的回傳值
      const apiResponse = res.json.mock.calls[0][0];
      const { success } = outputValidator.safeParse(apiResponse.payload);
      expect(success).toBe(true);
    });
  });

  // Info: (20241122 - tzuhan) @Murky comment this test for testing
  // xdescribe('Post certificate', () => {
  //   it('should return data match frontend validator', async () => {
  //     req = {
  //       headers: {},
  //       query: {
  //         companyId: '1000',
  //       },
  //       body: {
  //         fileIds: [1009],
  //       },
  //       method: 'POST',
  //       json: jest.fn(),
  //     } as unknown as jest.Mocked<NextApiRequest>;

  //     res = {
  //       status: jest.fn().mockReturnThis(),
  //       json: jest.fn(),
  //     } as unknown as jest.Mocked<NextApiResponse>;

  //     const outputValidator = certificatePostSchema.frontend;

  //     await handler(req, res);

  //     // Info: (20241105 - Murky) res.json的回傳值
  //     const apiResponse = res.json.mock.calls[0][0];
  //     const { success } = outputValidator.safeParse(apiResponse.payload);
  //     expect(success).toBe(true);
  //   });
  // });
});
