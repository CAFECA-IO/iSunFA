import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v2/file/[fileId]/index';
import prisma from '@/client';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { filePutSchema } from '@/lib/utils/zod_schema/file';

jest.mock('../../../../../lib/utils/session', () => ({
  getSession: jest.fn().mockResolvedValue({
    userId: 1000,
    companyId: 1000,
    roleId: 1001,
    cookie: {
      httpOnly: false,
      path: 'string',
      secure: false,
    },
  }),
}));

jest.mock('../../../../../lib/utils/auth_check', () => ({
  checkAuthorization: jest.fn().mockResolvedValue(true),
}));

beforeEach(() => {
  jest.spyOn(prisma.userActionLog, 'create').mockResolvedValue({
    id: 1,
    sessionId: '1',
    userId: 1000,
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

xdescribe('file/[fileId]/index integration test', () => {
  let req: jest.Mocked<NextApiRequest>;
  let res: jest.Mocked<NextApiResponse>;
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('Put file', () => {
    it('should return data match frontend validator', async () => {
      req = {
        headers: {},
        query: {
          fileId: '1000',
        },
        method: 'PUT',
        json: jest.fn(),
        body: {
          name: 'test.jpg',
        },
      } as unknown as jest.Mocked<NextApiRequest>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as jest.Mocked<NextApiResponse>;

      const outputValidator = filePutSchema.frontend;

      await handler(req, res);

      // Info: (20241105 - Murky) res.json的回傳值
      const apiResponse = res.json.mock.calls[0][0];
      const { success } = outputValidator.safeParse(apiResponse.payload);
      expect(success).toBe(true);
      expect(apiResponse.payload.name).toBe('test.jpg');

      // Info: (20241206 - Murky) 回覆原狀
      req = {
        headers: {},
        query: {
          fileId: '1000',
        },
        method: 'PUT',
        json: jest.fn(),
        body: {
          name: '100000.jpg',
        },
      } as unknown as jest.Mocked<NextApiRequest>;

      await handler(req, res);
    });
  });
});
