import handler, {
  handleGetRequest,
  handlePostRequest,
} from '@/pages/api/v2/company/[companyId]/voucher/index';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { VoucherListTabV2, VoucherV2Action } from '@/constants/voucher';
import { EventType } from '@/constants/account';
import { SortBy, SortOrder } from '@/constants/sort';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { voucherListSchema } from '@/lib/utils/zod_schema/voucher';

jest.mock('../../../../../../lib/utils/session.ts', () => ({
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

jest.mock('../../../../../../lib/utils/auth_check', () => ({
  checkAuthorization: jest.fn().mockResolvedValue(true),
}));

// Info: (20240927 - Murky) Comment if you want to check validateRequest related info
// jest.mock('../../../../../../lib/utils/logger_back', () => ({
//   loggerRequest: jest.fn().mockReturnValue({
//     info: jest.fn(),
//     error: jest.fn(),
//   }),
//   loggerError: jest.fn().mockReturnValue({
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

describe('company/[companyId]/voucher handleRequest test', () => {
  describe('GET Voucher List', () => {
    it('should pass', async () => {
      const query = {
        page: 1,
        pageSize: 10,
        tab: VoucherListTabV2.UPLOADED,
        type: EventType.PAYMENT,
        startDate: 1,
        endDate: 1,
        searchQuery: 'string',
        // sortOption: 'Date:asc-Amount:desc',
        sortOption: [
          {
            sortBy: SortBy.DATE,
            sortOrder: SortOrder.ASC,
          },
        ],
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

      const { statusMessage } = await handleGetRequest({
        query,
        body,
        session,
      });

      expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_LIST);
    });
  });

  describe('POST Voucher', () => {
    it('should pass', async () => {
      const query = {};
      const body = {
        actions: [VoucherV2Action.ADD_ASSET],
        certificateIds: [1001, 1002],
        voucherDate: 10000000,
        type: EventType.PAYMENT,
        note: 'this is note',
        counterPartyId: 1001,
        lineItems: [
          { accountId: 1001, description: 'this is for Particulars', debit: true, amount: 1000 },
          { accountId: 1002, description: 'this is for Particulars', debit: false, amount: 1000 },
        ],
        recurringEntry: {
          type: 'month',
          startDate: 1000000,
          endDate: 1000100,
          daysOfWeek: [0, 1, 2],
          daysOfMonth: [1, 15, 30],
          daysOfYears: [
            {
              month: 1,
              day: 1,
            },
            {
              month: 12,
              day: 25,
            },
          ],
        },
        assetIds: [1001],
        reverseVouchers: [
          {
            voucherId: 1003,
            amount: 500,
            lineItemIdBeReversed: 1001,
            lineItemIdReverseOther: 1002,
          },
        ],
      };

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
      const { statusMessage } = await handlePostRequest({
        query,
        body,
        session,
      });

      expect(statusMessage).toBe(STATUS_MESSAGE.CREATED);
    });
  });
});

describe('company/[companyId]/voucher integration test', () => {
  let req: jest.Mocked<NextApiRequest>;
  let res: jest.Mocked<NextApiResponse>;
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('Get list voucher', () => {
    it('should return data match frontend validator', async () => {
      req = {
        headers: {},
        query: {
          page: '1',
          pageSize: '10',
          tab: VoucherListTabV2.UPLOADED,
          type: EventType.PAYMENT,
          startDate: '1',
          endDate: '1',
          searchQuery: 'string',
          sortOption: 'Date:asc-Amount:desc',
        },
        method: 'GET',
        json: jest.fn(),
        body: {},
      } as unknown as jest.Mocked<NextApiRequest>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as jest.Mocked<NextApiResponse>;

      const outputValidator = voucherListSchema.frontend;

      await handler(req, res);

      // Info: (20241105 - Murky) res.json的回傳值
      const apiResponse = res.json.mock.calls[0][0];
      const { success } = outputValidator.safeParse(apiResponse.payload);
      expect(success).toBe(true);
    });
  });

  describe('Post voucher', () => {
    it('should return data match frontend validator', async () => {
      req = {
        headers: {},
        query: {},
        body: {
          actions: ['add_asset', 'revert'],
          certificateIds: [],
          voucherDate: 1,
          type: 'payment',
          note: '',
          lineItems: [
            {
              description: '存入銀行',
              amount: 1000,
              debit: true,
              accountId: 10000000,
            },
            {
              description: '存入銀行',
              amount: 1000,
              debit: false,
              accountId: 10000001,
            },
          ],
          assetIds: [1],
          counterPartyId: 1001,
          reverseVouchers: [
            {
              voucherId: 1001,
              lineItemIdBeReversed: 10000000,
              lineItemIdReverseOther: 0,
              amount: 100,
            },
          ],
        },
        method: 'POST',
        json: jest.fn(),
      } as unknown as jest.Mocked<NextApiRequest>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as jest.Mocked<NextApiResponse>;

      await handler(req, res);
      const apiResponse = res.json.mock.calls[0][0];
      const assetVoucher = await prisma.assetVoucher.findFirst({
        where: {
          assetId: req.body.assetIds[0],
          voucherId: apiResponse.payload,
        },
      });

      if (assetVoucher) {
        await prisma.assetVoucher.delete({
          where: {
            id: assetVoucher.id,
          },
        });
      }

      const associateVoucher = await prisma.accociateVoucher.findFirst({
        where: {
          originalVoucherId: req.body.reverseVouchers[0].voucherId,
        },
      });

      const associateLineItem = await prisma.accociateLineItem.findFirst({
        where: {
          originalLineItemId: req.body.reverseVouchers[0].lineItemIdBeReversed,
        },
      });

      const event = await prisma.event.findFirst({
        where: {
          id: associateVoucher?.eventId,
        },
      });

      if (associateLineItem) {
        await prisma.accociateLineItem.delete({
          where: {
            id: associateLineItem.id,
          },
        });
      }
      if (associateVoucher) {
        await prisma.accociateVoucher.delete({
          where: {
            id: associateVoucher.id,
          },
        });
      }

      if (event) {
        await prisma.event.delete({
          where: {
            id: event.id,
          },
        });
      }

      const voucher = await prisma.voucher.findFirst({
        where: {
          id: apiResponse.payload,
        },
        include: {
          lineItems: true,
        },
      });

      if (voucher) {
        await Promise.all(
          voucher.lineItems.map((lineItem) => {
            const deletedLineItem = prisma.lineItem.delete({
              where: {
                id: lineItem.id,
              },
            });

            return deletedLineItem;
          })
        );

        await prisma.voucher.delete({
          where: {
            id: voucher.id,
          },
        });
      }
      expect(apiResponse.message).toBe(STATUS_MESSAGE.CREATED);
      expect(apiResponse.payload).toBeGreaterThanOrEqual(10000000);
      expect(associateLineItem).toBeDefined();

      expect(associateVoucher).toBeDefined();

      expect(event).toBeDefined();
    });
  });
});
