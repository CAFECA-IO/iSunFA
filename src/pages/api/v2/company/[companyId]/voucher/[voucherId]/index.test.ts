import { NextApiRequest, NextApiResponse } from 'next';
import handler, {
  handleDeleteRequest,
  // handlePutRequest,
} from '@/pages/api/v2/company/[companyId]/voucher/[voucherId]/index';
import { STATUS_MESSAGE } from '@/constants/status_code';
// import { VoucherV2Action } from '@/constants/voucher';
// import { EventType } from '@/constants/account';
import prisma from '@/client';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { voucherGetOneSchema } from '@/lib/utils/zod_schema/voucher';

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
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('company/[companyId]/voucher/[voucherId]', () => {
  const mockVoucherId = 1;

  // describe('PUT One Voucher', () => {
  //   it('should pass', async () => {
  //     const session = {
  //       userId: 1001,
  //       companyId: 1001,
  //       roleId: 1001,
  //       cookie: {
  //         httpOnly: false,
  //         path: 'string',
  //         secure: false,
  //       },
  //     };
  //     const query = {
  //       voucherId: mockVoucherId,
  //     };
  //     const body = {
  //       actions: [VoucherV2Action.ADD_ASSET],
  //       certificateIds: [1001, 1002],
  //       voucherDate: 10000000,
  //       type: EventType.PAYMENT,
  //       note: 'this is note',
  //       counterPartyId: 1001,
  //       lineItems: [
  //         { accountId: 1001, description: 'this is for Particulars', debit: true, amount: 1000 },
  //         { accountId: 1002, description: 'this is for Particulars', debit: false, amount: 1000 },
  //       ],
  //       recurringEntry: {
  //         type: 'month',
  //         startDate: 1000000,
  //         endDate: 1000100,
  //         daysOfWeek: [0, 1, 2],
  //         daysOfMonth: [1, 15, 30],
  //         daysOfYears: [
  //           {
  //             month: 1,
  //             day: 1,
  //           },
  //           {
  //             month: 12,
  //             day: 25,
  //           },
  //         ],
  //       },
  //       assetIds: [1001],
  //       reverseVouchers: [
  //         {
  //           voucherId: 1003,
  //           amount: 500,
  //           lineItemIdBeReversed: 1001,
  //           lineItemIdReverseOther: 1002,
  //         },
  //       ],
  //     };
  //     const { statusMessage } = await handlePutRequest({
  //       query,
  //       body,
  //       session,
  //     });

  //     expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_UPDATE);
  //   });
  // });

  describe('DELETE One Voucher', () => {
    it('should pass', async () => {
      const query = {
        voucherId: mockVoucherId,
      };
      const body = {};

      const session = {
        userId: 1001,
        companyId: 1001,
        roleId: 1001,
        cookie: {
          httpOnly: false,
          path: 'string',
          secure: false,
        },
      };
      const { statusMessage } = await handleDeleteRequest({
        query,
        body,
        session,
      });

      expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_DELETE);
    });
  });
});

describe('company/[companyId]/voucher/voucherId integration test', () => {
  let req: jest.Mocked<NextApiRequest>;
  let res: jest.Mocked<NextApiResponse>;
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('Get one voucher', () => {
    it('should return data match frontend validator', async () => {
      req = {
        headers: {},
        query: {
          voucherId: '1000',
        },
        method: 'GET',
        json: jest.fn(),
        body: {},
      } as unknown as jest.Mocked<NextApiRequest>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as jest.Mocked<NextApiResponse>;

      const outputValidator = voucherGetOneSchema.frontend;

      await handler(req, res);

      // Info: (20241105 - Murky) res.json的回傳值
      const apiResponse = res.json.mock.calls[0][0];
      const { success } = outputValidator.safeParse(apiResponse.payload);
      expect(success).toBe(true);
    });
  });
});
