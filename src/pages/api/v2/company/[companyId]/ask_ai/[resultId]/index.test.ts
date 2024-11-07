import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { AI_TYPE } from '@/constants/aich';
import handler from '@/pages/api/v2/company/[companyId]/ask_ai/[resultId]/index';
import { askAIGetResultV2Schema } from '@/lib/utils/zod_schema/ask_ai';

jest.mock('../../../../../../../lib/utils/session.ts', () => ({
  getSession: jest.fn().mockResolvedValue({
    userId: 1001,
    companyId: 1001,
    roleId: 1001,
    cookie: {
      httpOnly: false,
      path: 'string',
      secure: false,
    },
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
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('company/[companyId]/ask_ai/[resultId] integration test', () => {
  let req: jest.Mocked<NextApiRequest>;
  let res: jest.Mocked<NextApiResponse>;
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('Get list voucher', () => {
    describe('AI GET Voucher', () => {
      it('should return data match frontend validator', async () => {
        req = {
          headers: {},
          query: {
            resultId: 'fakeResultId',
            reason: AI_TYPE.VOUCHER, // Info: (20241107 - Murky) voucher return
          },
          method: 'GET',
          json: jest.fn(),
          body: {},
        } as unknown as jest.Mocked<NextApiRequest>;

        res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        } as unknown as jest.Mocked<NextApiResponse>;

        const outputValidator = askAIGetResultV2Schema.frontend;

        await handler(req, res);

        // Info: (20241105 - Murky) res.json的回傳值
        const apiResponse = res.json.mock.calls[0][0];
        const { success } = outputValidator.safeParse(apiResponse.payload);
        expect(success).toBe(true);
      });
    });
  });
});
