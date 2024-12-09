import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v2/user/[userId]/setting/index';
import prisma from '@/client';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { userSettingPutSchema } from '@/lib/utils/zod_schema/user_setting';

jest.mock('../../../../../../lib/utils/session.ts', () => ({
  getSession: jest.fn().mockResolvedValue({
    userId: 10000000,
    companyId: 10000016,
  }),
}));

jest.mock('../../../../../../lib/utils/auth_check', () => ({
  checkAuthorization: jest.fn().mockResolvedValue(true),
}));

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
  describe('Put', () => {
    it('should return data match frontend validator', async () => {
      req = {
        headers: {},
        query: {
          userId: '10000000',
        },
        method: 'PUT',
        json: jest.fn(),
        body: {
          id: 10000016,
          userId: 10000000,
          personalInfo: {
            firstName: 'firstName',
            lastName: 'lastName',
            country: 'USA',
            language: 'Chinese',
            phone: '12345678',
          },
          notificationSetting: {
            systemNotification: false,
            updateAndSubscriptionNotification: true,
            emailNotification: true,
          },
          createdAt: 1733721778,
          updatedAt: 1733721778,
          deletedAt: null,
        },
      } as unknown as jest.Mocked<NextApiRequest>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as jest.Mocked<NextApiResponse>;

      const outputValidator = userSettingPutSchema.frontend;

      await handler(req, res);

      // Info: (20241105 - Murky) res.json的回傳值
      const apiResponse = res.json.mock.calls[0][0];
      const { success } = outputValidator.safeParse(apiResponse.payload);
      expect(success).toBe(true);
    });
  });
});
