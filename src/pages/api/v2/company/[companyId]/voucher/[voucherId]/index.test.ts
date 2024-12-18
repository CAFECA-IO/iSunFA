import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v2/company/[companyId]/voucher/[voucherId]/index';
// import { STATUS_MESSAGE } from '@/constants/status_code';
// import { VoucherV2Action } from '@/constants/voucher';
// import { EventType } from '@/constants/account';
import prisma from '@/client';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { voucherGetOneSchema } from '@/lib/utils/zod_schema/voucher';

// jest.mock('.prisma/client/index-browser.js', () => jest.requireActual('.prisma/client'));
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

// TODO: (20241218 - Shirley) FIXME: 因為 asset table schema 修改，導致 asset 相關的測試失敗，這個測試可能跟 list asset or get asset 的 function 跟 interface 有關
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
          voucherId: '1002',
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

  xdescribe('Put one voucher', () => {
    it('should return data match frontend validator', async () => {
      req = {
        headers: {},
        query: {
          voucherId: '1002',
        },
        method: 'PUT',
        json: jest.fn(),
        body: {
          actions: [],
          certificateIds: [1001],
          voucherDate: 1,
          type: 'payment',
          note: '',
          lineItems: [
            {
              // Info: (20241118 - Murky) id: 1000
              description: '償還應付帳款-銀行現金',
              amount: 100,
              debit: false,
              accountId: 10000603,
            },
            {
              // Info: (20241118 - Murky) id: 1001
              description: '償還應付帳款-應付帳款',
              amount: 100,
              debit: true,
              accountId: 10000981,
            },
          ],
          assetIds: [2],
          counterPartyId: 1001,
          reverseVouchers: [
            {
              voucherId: 1001,
              lineItemIdBeReversed: 1000,
              lineItemIdReverseOther: 1,
              amount: 100,
            },
          ],
        },
      } as unknown as jest.Mocked<NextApiRequest>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as jest.Mocked<NextApiResponse>;

      // const outputValidator = voucherGetOneSchema.frontend;

      // try {
      await handler(req, res);
      // } catch (error) {
      // console.log('error', error);
      // }
      const apiResponse = res.json.mock.calls[0][0];
      expect(apiResponse.payload).toBe(1002);

      const voucher = await prisma.voucher.findFirst({
        where: {
          id: 1000,
        },
      });

      const assetVoucherRelationship = await prisma.assetVoucher.findFirst({
        where: {
          voucherId: 1002,
        },
      });

      const certificateVoucherRelationship = await prisma.voucherCertificate.findFirst({
        where: {
          voucherId: 1002,
        },
      });
      const associateVoucher = await prisma.associateVoucher.findFirst({
        where: {
          resultVoucherId: 1002,
        },
      });

      const newAssociateLineItem = await prisma.associateLineItem.findFirst({
        where: {
          originalLineItemId: 1000,
        },
      });

      const oldAssociateLineItem = await prisma.associateLineItem.findFirst({
        where: {
          originalLineItemId: 1001,
        },
      });

      req = {
        headers: {},
        query: {
          voucherId: '1002',
        },
        method: 'PUT',
        json: jest.fn(),
        body: {
          actions: [],
          certificateIds: [1002],
          voucherDate: 1672531200,
          type: 'payment',
          note: '',
          lineItems: [
            {
              // Info: (20241118 - Murky) id: 1000
              description: '償還應付帳款-銀行現金',
              amount: 100,
              debit: false,
              accountId: 10000603,
            },
            {
              // Info: (20241118 - Murky) id: 1001
              description: '償還應付帳款-應付帳款',
              amount: 100,
              debit: true,
              accountId: 10000981,
            },
          ],
          assetIds: [1],
          counterPartyId: 1000,
          reverseVouchers: [
            {
              voucherId: 1000,
              lineItemIdBeReversed: 1001,
              lineItemIdReverseOther: 1,
              amount: 100,
            },
          ],
        },
      } as unknown as jest.Mocked<NextApiRequest>;
      await handler(req, res);
      expect(voucher).not.toBeNull();
      expect(voucher?.counterPartyId).toBe(1000);
      expect(assetVoucherRelationship).not.toBeNull();
      expect(assetVoucherRelationship?.assetId).toBe(2);
      expect(certificateVoucherRelationship).not.toBeNull();
      expect(certificateVoucherRelationship?.certificateId).toBe(1001);
      expect(associateVoucher).not.toBeNull();
      expect(associateVoucher?.originalVoucherId).toBe(1001);

      expect(newAssociateLineItem).not.toBeNull();
      expect(oldAssociateLineItem).toBeNull();
    });
  });

  xdescribe('Delete one voucher', () => {
    it('should return data match frontend validator', async () => {
      req = {
        headers: {},
        query: {
          voucherId: '1002',
        },
        method: 'DELETE',
        json: jest.fn(),
        body: {},
      } as unknown as jest.Mocked<NextApiRequest>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as jest.Mocked<NextApiResponse>;

      await handler(req, res);

      const apiResponse = res.json.mock.calls[0][0];
      expect(typeof apiResponse.payload).toBe('number');
    });
  });
});
