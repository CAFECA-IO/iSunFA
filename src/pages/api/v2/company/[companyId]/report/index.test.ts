import { NextApiRequest, NextApiResponse } from 'next';
import {
  balanceSheetHandler,
  handleGetRequest,
} from '@/pages/api/v2/company/[companyId]/report/index';
import { STATUS_MESSAGE } from '@/constants/status_code';

import { FinancialReportTypesKey } from '@/interfaces/report_type';
import prisma from '@/client';
import { Account, Company, LineItem, Prisma, PrismaPromise, Voucher } from '@prisma/client';
import { CASH_AND_CASH_EQUIVALENTS_CODE } from '@/constants/cash_flow/common_cash_flow';
import { timestampInSeconds } from '@/lib/utils/common';
import { FinancialReport } from '@/interfaces/report';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

jest.mock('../../../../../../lib/utils/session.ts', () => ({
  getSession: jest.fn().mockResolvedValue({
    userId: 1001,
    companyId: 1001,
  }),
}));

jest.mock('../../../../../../lib/utils/auth_check', () => ({
  checkAuthorization: jest.fn().mockResolvedValue(true),
}));

// Info: (20241007 - Murky) Uncomment this to check zod return
// jest.mock('../../../../../../lib/utils/logger_back', () => ({
//   loggerRequest: jest.fn().mockReturnValue({
//     info: jest.fn(),
//     error: jest.fn(),
//   }),
// }));

const mockCompany: Company = {
  id: 1000,
  name: 'local',
  taxId: '11',
  imageFileId: 10000050,
  startDate: 1728982909,
  createdAt: 1728982909,
  updatedAt: 1728982909,
  deletedAt: null,
  tag: 'all',
};
// mock prisma.voucher.findMany
// (Voucher & { lineItems: (LineItem & { account: Account })[] })
const mockLineItems: (LineItem & { account: Account })[] = [
  {
    id: 10000009,
    amount: 1000,
    debit: false,
    accountId: 10001093,
    voucherId: 10000000,
    createdAt: 1728900671,
    updatedAt: 1728900671,
    deletedAt: null,
    description: '',
    account: {
      id: 10001093,
      companyId: 1002,
      system: 'IFRS',
      type: 'equity',
      debit: false,
      liquidity: false,
      code: '3473',
      name: '與待出售非流動資產(或處分群組)直接相關之權益-採用權益法之關聯企業及合資',
      forUser: true,
      level: 3,
      parentCode: '3470',
      rootCode: '3470',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000010,
    amount: 66000,
    debit: true,
    accountId: 10000601,
    voucherId: 10000001,
    createdAt: 1728983168,
    updatedAt: 1728983168,
    deletedAt: null,
    description: '',
    account: {
      id: 10000601,
      companyId: 1002,
      system: 'IFRS',
      type: 'asset',
      debit: true,
      liquidity: true,
      code: '1101',
      name: '庫存現金',
      forUser: true,
      level: 3,
      parentCode: '1100',
      rootCode: '1100',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000011,
    amount: 4000,
    debit: false,
    accountId: 10001061,
    voucherId: 10000001,
    createdAt: 1728983168,
    updatedAt: 1728983168,
    deletedAt: null,
    description: '',
    account: {
      id: 10001061,
      companyId: 1002,
      system: 'IFRS',
      type: 'equity',
      debit: false,
      liquidity: false,
      code: '3351',
      name: '累積盈虧',
      forUser: true,
      level: 3,
      parentCode: '3350',
      rootCode: '3350',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000012,
    amount: 10000,
    debit: true,
    accountId: 10000627,
    voucherId: 10000001,
    createdAt: 1728983168,
    updatedAt: 1728983168,
    deletedAt: null,
    description: '',
    account: {
      id: 10000627,
      companyId: 1002,
      system: 'IFRS',
      type: 'asset',
      debit: true,
      liquidity: true,
      code: '1172',
      name: '應收帳款',
      forUser: true,
      level: 3,
      parentCode: '1170',
      rootCode: '1170',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000013,
    amount: 30000,
    debit: false,
    accountId: 10000975,
    voucherId: 10000001,
    createdAt: 1728983168,
    updatedAt: 1728983168,
    deletedAt: null,
    description: '',
    account: {
      id: 10000975,
      companyId: 1002,
      system: 'IFRS',
      type: 'liability',
      debit: false,
      liquidity: true,
      code: '2133',
      name: '預收收入',
      forUser: true,
      level: 3,
      parentCode: '2130',
      rootCode: '2130',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000014,
    amount: 200000,
    debit: false,
    accountId: 10000568,
    voucherId: 10000001,
    createdAt: 1728983168,
    updatedAt: 1728983168,
    deletedAt: null,
    description: '',
    account: {
      id: 10000568,
      companyId: 1002,
      system: 'IFRS',
      type: 'equity',
      debit: false,
      liquidity: false,
      code: '3110',
      name: '普通股股本',
      forUser: true,
      level: 2,
      parentCode: '3100',
      rootCode: '3110',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000015,
    amount: 100000,
    debit: true,
    accountId: 10001206,
    voucherId: 10000001,
    createdAt: 1728983168,
    updatedAt: 1728983168,
    deletedAt: null,
    description: '',
    account: {
      id: 10001206,
      companyId: 1002,
      system: 'IFRS',
      type: 'asset',
      debit: true,
      liquidity: false,
      code: '1691',
      name: '辦公設備成本',
      forUser: true,
      level: 4,
      parentCode: '1690',
      rootCode: '1600',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000016,
    amount: 60000,
    debit: true,
    accountId: 10000679,
    voucherId: 10000001,
    createdAt: 1728983168,
    updatedAt: 1728983168,
    deletedAt: null,
    description: '',
    account: {
      id: 10000679,
      companyId: 1002,
      system: 'IFRS',
      type: 'asset',
      debit: true,
      liquidity: true,
      code: '1412',
      name: '預付租金',
      forUser: true,
      level: 3,
      parentCode: '1410',
      rootCode: '1410',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000017,
    amount: 50000,
    debit: false,
    accountId: 10000965,
    voucherId: 10000001,
    createdAt: 1728983168,
    updatedAt: 1728983168,
    deletedAt: null,
    description: '',
    account: {
      id: 10000965,
      companyId: 1002,
      system: 'IFRS',
      type: 'liability',
      debit: false,
      liquidity: true,
      code: '2108',
      name: '其他短期借款',
      forUser: true,
      level: 3,
      parentCode: '2100',
      rootCode: '2100',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000018,
    amount: 60000,
    debit: true,
    accountId: 10000603,
    voucherId: 10000001,
    createdAt: 1728983168,
    updatedAt: 1728983168,
    deletedAt: null,
    description: '',
    account: {
      id: 10000603,
      companyId: 1002,
      system: 'IFRS',
      type: 'asset',
      debit: true,
      liquidity: true,
      code: '1103',
      name: '銀行存款',
      forUser: true,
      level: 3,
      parentCode: '1100',
      rootCode: '1100',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000019,
    amount: 12000,
    debit: false,
    accountId: 10000981,
    voucherId: 10000001,
    createdAt: 1728983168,
    updatedAt: 1728983168,
    deletedAt: null,
    description: '',
    account: {
      id: 10000981,
      companyId: 1002,
      system: 'IFRS',
      type: 'liability',
      debit: false,
      liquidity: true,
      code: '2171',
      name: '應付帳款',
      forUser: true,
      level: 3,
      parentCode: '2170',
      rootCode: '2170',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000020,
    amount: 204000,
    debit: true,
    accountId: 10000627,
    voucherId: 10000002,
    createdAt: 1728983261,
    updatedAt: 1728983261,
    deletedAt: null,
    description: '',
    account: {
      id: 10000627,
      companyId: 1002,
      system: 'IFRS',
      type: 'asset',
      debit: true,
      liquidity: true,
      code: '1172',
      name: '應收帳款',
      forUser: true,
      level: 3,
      parentCode: '1170',
      rootCode: '1170',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000021,
    amount: 2000,
    debit: true,
    accountId: 10000299,
    voucherId: 10000002,
    createdAt: 1728983261,
    updatedAt: 1728983261,
    deletedAt: null,
    description: '',
    account: {
      id: 10000299,
      companyId: 1002,
      system: 'IFRS',
      type: 'revenue',
      debit: true,
      liquidity: true,
      code: '4190',
      name: '銷貨折讓',
      forUser: true,
      level: 2,
      parentCode: '4100',
      rootCode: '4190',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000022,
    amount: 2000,
    debit: true,
    accountId: 10000298,
    voucherId: 10000002,
    createdAt: 1728983261,
    updatedAt: 1728983261,
    deletedAt: null,
    description: '',
    account: {
      id: 10000298,
      companyId: 1002,
      system: 'IFRS',
      type: 'revenue',
      debit: true,
      liquidity: true,
      code: '4170',
      name: '銷貨退回',
      forUser: true,
      level: 2,
      parentCode: '4100',
      rootCode: '4170',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000023,
    amount: 208000,
    debit: false,
    accountId: 10000801,
    voucherId: 10000002,
    createdAt: 1728983261,
    updatedAt: 1728983261,
    deletedAt: null,
    description: '',
    account: {
      id: 10000801,
      companyId: 1002,
      system: 'IFRS',
      type: 'revenue',
      debit: false,
      liquidity: true,
      code: '4111',
      name: '銷貨收入',
      forUser: true,
      level: 3,
      parentCode: '4110',
      rootCode: '4110',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000024,
    amount: 50000,
    debit: true,
    accountId: 10000366,
    voucherId: 10000003,
    createdAt: 1728983354,
    updatedAt: 1728983354,
    deletedAt: null,
    description: '',
    account: {
      id: 10000366,
      companyId: 1002,
      system: 'IFRS',
      type: 'expense',
      debit: true,
      liquidity: true,
      code: '6210',
      name: '管理費用 - 薪資支出',
      forUser: true,
      level: 2,
      parentCode: '6200',
      rootCode: '6210',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000025,
    amount: 12000,
    debit: true,
    accountId: 10000367,
    voucherId: 10000003,
    createdAt: 1728983354,
    updatedAt: 1728983354,
    deletedAt: null,
    description: '',
    account: {
      id: 10000367,
      companyId: 1002,
      system: 'IFRS',
      type: 'expense',
      debit: true,
      liquidity: true,
      code: '6211',
      name: '管理費用 - 租金支出',
      forUser: true,
      level: 2,
      parentCode: '6200',
      rootCode: '6211',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000026,
    amount: 2000,
    debit: true,
    accountId: 10000374,
    voucherId: 10000003,
    createdAt: 1728983354,
    updatedAt: 1728983354,
    deletedAt: null,
    description: '',
    account: {
      id: 10000374,
      companyId: 1002,
      system: 'IFRS',
      type: 'expense',
      debit: true,
      liquidity: true,
      code: '6218',
      name: '管理費用 - 水電瓦斯費',
      forUser: true,
      level: 2,
      parentCode: '6200',
      rootCode: '6218',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000027,
    amount: 12000,
    debit: true,
    accountId: 10000373,
    voucherId: 10000003,
    createdAt: 1728983354,
    updatedAt: 1728983354,
    deletedAt: null,
    description: '',
    account: {
      id: 10000373,
      companyId: 1002,
      system: 'IFRS',
      type: 'expense',
      debit: true,
      liquidity: true,
      code: '6217',
      name: '管理費用 - 廣告費',
      forUser: true,
      level: 2,
      parentCode: '6200',
      rootCode: '6217',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000028,
    amount: 76000,
    debit: false,
    accountId: 10000603,
    voucherId: 10000003,
    createdAt: 1728983354,
    updatedAt: 1728983354,
    deletedAt: null,
    description: '',
    account: {
      id: 10000603,
      companyId: 1002,
      system: 'IFRS',
      type: 'asset',
      debit: true,
      liquidity: true,
      code: '1103',
      name: '銀行存款',
      forUser: true,
      level: 3,
      parentCode: '1100',
      rootCode: '1100',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000029,
    amount: 54000,
    debit: true,
    accountId: 10000322,
    voucherId: 10000004,
    createdAt: 1728983415,
    updatedAt: 1728983415,
    deletedAt: null,
    description: '',
    account: {
      id: 10000322,
      companyId: 1002,
      system: 'IFRS',
      type: 'cost',
      debit: true,
      liquidity: true,
      code: '5111',
      name: '銷貨成本',
      forUser: true,
      level: 2,
      parentCode: '5110',
      rootCode: '5111',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000030,
    amount: 54000,
    debit: false,
    accountId: 10001099,
    voucherId: 10000004,
    createdAt: 1728983415,
    updatedAt: 1728983415,
    deletedAt: null,
    description: '',
    account: {
      id: 10001099,
      companyId: 1002,
      system: 'IFRS',
      type: 'asset',
      debit: true,
      liquidity: true,
      code: '1301',
      name: '商品存貨',
      forUser: true,
      level: 4,
      parentCode: '1300',
      rootCode: '130X',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
];

const mockVoucher: (Voucher & { lineItems: (LineItem & { account: Account })[] })[] = [
  {
    id: 10000001,
    no: '20241015001',
    createdAt: 1728982978,
    updatedAt: 1728982978,
    deletedAt: null,
    note: null,
    companyId: 10000009,
    counterPartyId: 555,
    date: 1703952000,
    editable: true,
    issuerId: 1000,
    status: 'journal:JOURNAL.UPLOADED',
    type: 'payment',
  },
  {
    id: 10000002,
    no: '20241015001',
    createdAt: 1728983210,
    updatedAt: 1728983210,
    deletedAt: null,
    companyId: 10000009,
    counterPartyId: 555,
    date: 1704038400,
    editable: true,
    issuerId: 1000,
    note: null,
    status: 'journal:JOURNAL.UPLOADED',
    type: 'payment',
  },
  {
    id: 10000003,
    no: '20241015001',
    createdAt: 1728983287,
    updatedAt: 1728983287,
    deletedAt: null,
    companyId: 10000009,
    counterPartyId: 555,
    date: 1704988800,
    editable: true,
    issuerId: 1000,
    note: null,
    status: 'journal:JOURNAL.UPLOADED',
    type: 'payment',
  },
  {
    id: 10000004,
    no: '20241015001',
    createdAt: 1728983384,
    updatedAt: 1728983384,
    deletedAt: null,
    companyId: 10000009,
    counterPartyId: 555,
    date: 1705420800,
    editable: true,
    issuerId: 1000,
    note: null,
    status: 'journal:JOURNAL.UPLOADED',
    type: 'payment',
  },
].map((voucher) => {
  return {
    ...voucher,
    lineItems: mockLineItems.filter((lineItem) => lineItem.voucherId === voucher.id),
  };
});
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

describe('company/[companyId]/report', () => {
  describe('GET Report List', () => {
    it('should match patter', async () => {
      req.query = {
        startDate: '10000000',
        endDate: '16000000',
        language: 'zh',
        reportType: FinancialReportTypesKey.balance_sheet,
      };
      req.body = {};

      const { payload, statusMessage } = await handleGetRequest(req, res);

      expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_GET);
      expect(payload).toBeDefined();
    });
  });

  describe('report handlers', () => {
    // Info: (20241017 - Murky) 2024/01/01 ~ 2024/01/31
    const mockStartDate = timestampInSeconds(new Date(2024, 0, 1, 0, 0, 0).getTime());
    const mockEndDate = timestampInSeconds(new Date(2024, 0, 31, 23, 59, 59).getTime());
    beforeEach(() => {
      jest.spyOn(prisma.company, 'findUnique').mockResolvedValue(mockCompany);

      /**
       * Info: (20241016 - Murky)
       * getLineItemsInPrisma in src/lib/utils/repo/line_item.repo.ts
       */
      jest.spyOn(prisma.lineItem, 'findMany').mockImplementation((args) => {
        const { where } = args || {}; // 確保 where 存在

        const filteredLineItems = mockVoucher
          .filter(
            (voucher) =>
              // voucher.lineItems.some(
              //   (lineItem) => lineItem.account.type === where?.account?.type
              // ) &&
              voucher.date >=
                ((where?.voucher?.date as Prisma.IntFilter<'Voucher'>)?.gte as number) &&
              voucher.date <= ((where?.voucher?.date as Prisma.IntFilter<'Voucher'>)?.lte as number)
          )
          .flatMap((voucher) => voucher.lineItems)
          .filter((lineItem) => lineItem.account.type === where?.account?.type);

        return Promise.resolve(filteredLineItems) as unknown as PrismaPromise<
          typeof filteredLineItems
        >; // 確保返回 PrismaPromise
      });

      jest.spyOn(prisma.voucher, 'findMany').mockImplementation((args) => {
        const { where } = args || {}; // 確保 where 存在

        const filteredVouchers = mockVoucher
          .filter(
            (voucher) =>
              voucher.companyId === where?.companyId &&
              voucher.date >= ((where?.date as Prisma.IntFilter<'Voucher'>)?.gte as number) &&
              voucher.date <= ((where?.date as Prisma.IntFilter<'Voucher'>)?.lte as number) &&
              voucher.lineItems.some((lineItem) =>
                CASH_AND_CASH_EQUIVALENTS_CODE.some((cashCode) =>
                  lineItem.account.code.startsWith(cashCode)))
          )
          .map((voucher) => ({
            ...voucher,
            lineItems: voucher.lineItems.filter((lineItem) =>
              CASH_AND_CASH_EQUIVALENTS_CODE.some((cashCode) =>
                lineItem.account.code.startsWith(cashCode))),
          }));

        return Promise.resolve(filteredVouchers) as Prisma.PrismaPromise<typeof filteredVouchers>;
      });
    });
    describe('balance sheet handler', () => {
      it('should generate payload', async () => {
        const { payload, statusMessage } = await balanceSheetHandler({
          companyId: mockCompany.id,
          startDate: mockStartDate,
          endDate: mockEndDate,
          language: 'en',
        });
        expect(payload).toBeDefined();
        expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_GET);
      });

      it('should calculate correct answer', async () => {
        const { payload } = await balanceSheetHandler({
          companyId: mockCompany.id,
          startDate: mockStartDate,
          endDate: mockEndDate,
          language: 'en',
        });

        expect(payload).toBeDefined();
        const { details } = payload as FinancialReport;
        expect(details.length).toBeGreaterThan(0);
        const cashInBunker = details.find((detail) => detail.code === '1100');
        expect(cashInBunker).toBeDefined();
        expect(cashInBunker?.curPeriodAmount).toBe(50000);
      });
    });
  });
});
