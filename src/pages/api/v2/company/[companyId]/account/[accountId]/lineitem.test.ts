import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v2/company/[companyId]/account/[accountId]/lineitem';
import prisma from '@/client';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { lineItemGetByAccountSchema } from '@/lib/utils/zod_schema/line_item_account';
import { SPECIAL_ACCOUNTS } from '@/constants/account';

jest.mock('../../../../../../../lib/utils/session.ts', () => ({
  getSession: jest.fn().mockResolvedValue({
    userId: 1001,
    companyId: 1000,
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
  let accountId: number;
  beforeEach(async () => {
    const accountPayable = await prisma.account.findFirst({
      where: { code: SPECIAL_ACCOUNTS.ACCOUNT_PAYABLE.code },
    });

    accountId = accountPayable?.id || 10000981;
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('Get one voucher', () => {
    it('should return data match frontend validator', async () => {
      req = {
        headers: {},
        query: {
          accountId: `${accountId}`,
          page: '1',
          pageSize: '10',
          // tab: VoucherListTabV2.UPLOADED,
          // type: EventType.PAYMENT,
          startDate: '1',
          endDate: '1',
          searchQuery: 'string',
          sortOption: '',
        },
        method: 'GET',
        json: jest.fn(),
        body: {},
      } as unknown as jest.Mocked<NextApiRequest>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as jest.Mocked<NextApiResponse>;

      const outputValidator = lineItemGetByAccountSchema.frontend;

      await handler(req, res);

      // Info: (20241105 - Murky) res.json的回傳值
      const apiResponse = res.json.mock.calls[0][0];
      const { success } = outputValidator.safeParse(apiResponse.payload);
      expect(success).toBe(true);
    });
  });
});
