import { NextApiRequest, NextApiResponse } from 'next';
import {
  balanceSheetHandler,
  cashFlowHandler,
  handleGetRequest,
  incomeStatementHandler,
} from '@/pages/api/v2/company/[companyId]/report/index';
import { STATUS_MESSAGE } from '@/constants/status_code';

import { FinancialReportTypesKey } from '@/interfaces/report_type';
import prisma from '@/client';
import { Account, Company, LineItem, Prisma, PrismaPromise, Voucher } from '@prisma/client';
import { CASH_AND_CASH_EQUIVALENTS_CODE } from '@/constants/cash_flow/common_cash_flow';
import { timestampInSeconds } from '@/lib/utils/common';
import { BalanceSheetReport, FinancialReport, IncomeStatementReport } from '@/interfaces/report';

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

// Info: (20241007 - Murky) Uncomment this to check zod return log
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
  {
    id: 10000031,
    amount: 3000,
    debit: true,
    accountId: 10000603,
    voucherId: 10000005,
    createdAt: 1728983415,
    updatedAt: 1728983415,
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
    id: 10000032,
    amount: 3000,
    debit: false,
    accountId: 10000417,
    voucherId: 10000005,
    createdAt: 1728983415,
    updatedAt: 1728983415,
    deletedAt: null,
    description: '',
    account: {
      id: 10000417,
      companyId: 1002,
      system: 'IFRS',
      type: 'income',
      debit: false,
      liquidity: true,
      code: '7101',
      name: '銀行存款利息',
      forUser: true,
      level: 2,
      parentCode: '7100',
      rootCode: '7101',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  // Info: (20241017 - Murky) Cash Flow特別要測試的分錄voucherId從20000000, voucherDate從 6/1開始
  {
    id: 10000033,
    amount: 500,
    debit: true,
    accountId: 10000014,
    voucherId: 20000000,
    createdAt: 1728983415,
    updatedAt: 1728983415,
    deletedAt: null,
    description: '',
    account: {
      id: 10000014,
      companyId: 1002,
      system: 'IFRS',
      type: 'income',
      debit: false,
      liquidity: true,
      code: '7950',
      name: '所得稅費用（利益）',
      forUser: false,
      level: 0,
      parentCode: '7950',
      rootCode: '7950',
      createdAt: 0,
      updatedAt: 0,
      deletedAt: null,
    },
  },
  {
    id: 10000034,
    amount: 500,
    debit: false,
    accountId: 10000603,
    voucherId: 20000000,
    createdAt: 1728983415,
    updatedAt: 1728983415,
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
  {
    id: 10000005,
    no: '20241015002',
    createdAt: 1728983384,
    updatedAt: 1728983384,
    deletedAt: null,
    companyId: 10000009,
    counterPartyId: 555,
    date: 1705370673,
    editable: true,
    issuerId: 1000,
    note: null,
    status: 'journal:JOURNAL.UPLOADED',
    type: 'payment',
  },
  {
    id: 20000000,
    no: '20241015002',
    createdAt: 1728983384,
    updatedAt: 1728983384,
    deletedAt: null,
    companyId: 10000009,
    counterPartyId: 555,
    date: 1717209576, // Info: (20241017 - Murky) 2024/6/1
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
          voucher.date >= ((where?.voucher?.date as Prisma.IntFilter<'Voucher'>)?.gte as number) &&
          voucher.date <= ((where?.voucher?.date as Prisma.IntFilter<'Voucher'>)?.lte as number)
      )
      .flatMap((voucher) => voucher.lineItems)
      .filter((lineItem) => lineItem.account.type === where?.account?.type);

    return Promise.resolve(filteredLineItems) as unknown as PrismaPromise<typeof filteredLineItems>; // 確保返回 PrismaPromise
  });

  jest.spyOn(prisma.voucher, 'findMany').mockImplementation((args) => {
    const { where } = args || {}; // 確保 where 存在

    const filteredVouchers = mockVoucher.filter(
      (voucher) =>
        voucher.date >= ((where?.date as Prisma.IntFilter<'Voucher'>)?.gte as number) &&
        voucher.date <= ((where?.date as Prisma.IntFilter<'Voucher'>)?.lte as number) &&
        voucher.lineItems.some((lineItem) =>
          CASH_AND_CASH_EQUIVALENTS_CODE.some((cashCode) =>
            lineItem.account.code.startsWith(cashCode)))
    );
    return Promise.resolve(filteredVouchers) as Prisma.PrismaPromise<typeof filteredVouchers>;
  });
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
    describe('balance sheet handler', () => {
      // Info: (20241017 - Murky) 2024/01/01 ~ 2024/01/31
      const mockStartDate = timestampInSeconds(0);
      const mockEndDate = timestampInSeconds(1706716799000); // new Date(2024, 0, 31, 23, 59, 59).getTime());
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
        const { general, details, otherInfo } = payload as BalanceSheetReport;
        expect(details.length).toBeGreaterThan(0);

        /**
         * Info: (20241017 - Murky)
         * @description 1100 現金及約當現金
         */
        const cashAndCashEquivalents = details.find((detail) => detail.code === '1100');
        expect(cashAndCashEquivalents).toBeDefined();
        expect(cashAndCashEquivalents?.curPeriodAmount).toBe(53000);

        /**
         * Info: (20241017 - Murky)
         * @description 130X 存貨
         */
        const netAccountsReceivable = details.find((detail) => detail.code === '130X');
        expect(netAccountsReceivable).toBeDefined();
        expect(netAccountsReceivable?.curPeriodAmount).toBe(-54000);
        expect(netAccountsReceivable?.curPeriodPercentage).toBeCloseTo((-54000 / 373000) * 100, 0); // Info: (20241021 - Murky) divide by total assets

        /**
         * Info: (20241017 - Murky)
         * @description 預付款項
         */
        const prepayments = details.find((detail) => detail.code === '1410');
        expect(prepayments).toBeDefined();
        expect(prepayments?.curPeriodAmount).toBe(60000);
        expect(prepayments?.curPeriodPercentage).toBeCloseTo((60000 / 373000) * 100, 0); // Info: (20241021 - Murky) divide by total assets

        /**
         * Info: (20241017 - Murky)
         * @description 11XX 流動資產合計
         */
        const totalCurrentAssets = general.find((detail) => detail.code === '11XX');
        expect(totalCurrentAssets).toBeDefined();
        expect(totalCurrentAssets?.curPeriodAmount).toBe(273000);
        expect(totalCurrentAssets?.curPeriodPercentage).toBeCloseTo((273000 / 373000) * 100, 0); // Info: (20241021 - Murky) divide by total assets

        /**
         * Info: (20241017 - Murky)
         * @description 15XX 非流動資產合計
         */
        const totalNonCurrentAssets = general.find((detail) => detail.code === '15XX');
        expect(totalNonCurrentAssets).toBeDefined();
        expect(totalNonCurrentAssets?.curPeriodAmount).toBe(100000);
        expect(totalNonCurrentAssets?.curPeriodPercentage).toBeCloseTo((100000 / 373000) * 100, 0); // Info: (20241021 - Murky) divide by total assets

        /**
         * Info: (20241017 - Murky)
         * @description 1XXX 資產總計
         */
        const totalAssets = general.find((detail) => detail.code === '1XXX');
        expect(totalAssets).toBeDefined();
        expect(totalAssets?.curPeriodAmount).toBe(373000);
        expect(totalAssets?.curPeriodPercentage).toBe(100);

        /**
         * Info: (20241017 - Murky)
         * @description 2100 短期借款
         */
        const currentBorrowings = details.find((detail) => detail.code === '2100');
        expect(currentBorrowings).toBeDefined();
        expect(currentBorrowings?.curPeriodAmount).toBe(50000);
        expect(currentBorrowings?.curPeriodPercentage).toBeCloseTo((50000 / 373000) * 100, 0); // Info: (20241021 - Murky) divide by total asset

        /**
         * Info: (20241017 - Murky)
         * @description 2130 合約負債-流動
         */
        const currentContractLiabilities = details.find((detail) => detail.code === '2130');
        expect(currentContractLiabilities).toBeDefined();
        expect(currentContractLiabilities?.curPeriodAmount).toBe(30000);
        expect(currentContractLiabilities?.curPeriodPercentage).toBeCloseTo(
          (30000 / 373000) * 100,
          0
        ); // Info: (20241021 - Murky) divide by total asset

        /**
         * Info: (20241017 - Murky)
         * @description 2170 應付帳款(合計)
         */
        const accountsPayable = details.find((detail) => detail.code === '2170');
        expect(accountsPayable).toBeDefined();
        expect(accountsPayable?.curPeriodAmount).toBe(12000);
        expect(accountsPayable?.curPeriodPercentage).toBeCloseTo((12000 / 373000) * 100, 0); // Info: (20241021 - Murky) divide by total asset

        /**
         * Info: (20241017 - Murky)
         * @description 21XX 流動負債合計
         */
        const totalCurrentLiabilities = general.find((detail) => detail.code === '21XX');
        expect(totalCurrentLiabilities).toBeDefined();
        expect(totalCurrentLiabilities?.curPeriodAmount).toBe(92000);
        expect(totalCurrentLiabilities?.curPeriodPercentage).toBeCloseTo((92000 / 373000) * 100, 0); // Info: (20241021 - Murky) divide by total asset

        /**
         * Info: (20241017 - Murky)
         * @description 2XXX 負債總計
         */
        const totalLiabilities = general.find((detail) => detail.code === '2XXX');
        expect(totalLiabilities).toBeDefined();
        expect(totalLiabilities?.curPeriodAmount).toBe(92000);
        expect(totalLiabilities?.curPeriodPercentage).toBeCloseTo((92000 / 373000) * 100, 0); // Info: (20241021 - Murky) divide by total asset

        /**
         * Info: (20241017 - Murky)
         * @description 3151 累積盈虧
         * @note beta版未顯示
         */
        // const retainedEarnings = details.find((detail) => detail.code === '3351');
        // expect(retainedEarnings).toBeDefined();
        // expect(retainedEarnings?.curPeriodAmount).toBe(4000);

        /**
         * Info: (20241017 - Murky)
         * @description 3353 本期損益
         * @note beta版未顯示
         */
        // const totalRetainedEarnings = details.find((detail) => detail.code === '3353');
        // expect(totalRetainedEarnings).toBeDefined();
        // expect(totalRetainedEarnings?.curPeriodAmount).toBe(77000);

        /**
         * Info: (20241018 - Murky)
         * @description 3100 股本合計
         */
        const totalCapitalStock = general.find((detail) => detail.code === '3100');
        expect(totalCapitalStock).toBeDefined();
        expect(totalCapitalStock?.curPeriodAmount).toBe(200000);
        expect(totalCapitalStock?.curPeriodPercentage).toBeCloseTo((200000 / 373000) * 100, 0); // Info: (20241021 - Murky) divide by total asset

        /**
         * Info: (20241017 - Murky)
         * @description 3350 未分配盈餘（或待彌補虧損）
         * @note 4000 + 77000 = 81000
         */
        const unappropriatedRetainedEarnings = details.find((detail) => detail.code === '3350');
        expect(unappropriatedRetainedEarnings).toBeDefined();
        expect(unappropriatedRetainedEarnings?.curPeriodAmount).toBe(81000);
        expect(unappropriatedRetainedEarnings?.curPeriodPercentage).toBeCloseTo(
          (81000 / 373000) * 100,
          0
        ); // Info: (20241021 - Murky) divide by total asset

        /**
         * Info: (20241017 - Murky)
         * @description 3XXX 權益總計
         */
        const totalEquity = general.find((detail) => detail.code === '3XXX');
        expect(totalEquity).toBeDefined();
        expect(totalEquity?.curPeriodAmount).toBe(281000);
        expect(totalEquity?.curPeriodPercentage).toBeCloseTo((281000 / 373000) * 100, 0); // Info: (20241021 - Murky) divide by total asset

        // Info: (20241018 - Murky) Other Info
        expect(otherInfo).toBeDefined();
        const { dso } = otherInfo;
        expect(dso).toBeDefined();
        expect(dso.curDso).toBeCloseTo(365, 1);
      });
    });

    describe('income statement handler', () => {
      // Info: (20241017 - Murky) 2024/01/01 ~ 2024/01/31
      const mockStartDate = timestampInSeconds(1704038400000); // (new Date(2024, 0, 1, 0, 0, 0).getTime());
      const mockEndDate = timestampInSeconds(1706716799000); // new Date(2024, 0, 31, 23, 59, 59).getTime());
      it('should calculate correct answer', async () => {
        const { payload } = await incomeStatementHandler({
          companyId: mockCompany.id,
          startDate: mockStartDate,
          endDate: mockEndDate,
          language: 'en',
        });

        // Info: (20241017 - Murky) Payload 存在
        expect(payload).toBeDefined();

        const { general, details, otherInfo } = payload as IncomeStatementReport;

        // Info: (20241017 - Murky) General 與 details account 都有值
        expect(general.length).toBeGreaterThan(0);
        expect(details.length).toBeGreaterThan(0);

        /**
         * Info: (20241017 - Murky)
         * @description 4110 銷貨收入(總額)
         */
        const salesRevenueTotal = details.find((detail) => detail.code === '4110');
        expect(salesRevenueTotal).toBeDefined();
        expect(salesRevenueTotal?.curPeriodAmount).toBe(208000);
        expect(salesRevenueTotal?.curPeriodPercentage).toBeCloseTo((208000 / 204000) * 100, 0);

        /**
         * Info: (20241017 - Murky)
         * @description 4000 營業收入合計
         */
        const totalOperatingRevenue = general.find((detail) => detail.code === '4000');
        expect(totalOperatingRevenue).toBeDefined();
        expect(totalOperatingRevenue?.curPeriodAmount).toBe(204000);
        expect(totalOperatingRevenue?.curPeriodPercentage).toBeCloseTo((204000 / 204000) * 100, 0);

        /**
         * Info: (20241017 - Murky)
         * @description 4100 銷貨收入(淨額)
         * @note 目前沒有要顯示這個項目
         */
        // const netSalesRevenue = details.find((detail) => detail.code === '4100');
        // expect(netSalesRevenue).toBeDefined();
        // expect(netSalesRevenue?.curPeriodAmount).toBe(204000);
        // expect(netSalesRevenue?.curPeriodPercentage).toBeCloseTo((204000 / 204000) * 100, 0);

        /**
         * Info: (20241017 - Murky)
         * @description 5110 銷貨成本合計
         */
        const totalCostOfSales = details.find((detail) => detail.code === '5110');
        expect(totalCostOfSales).toBeDefined();
        expect(totalCostOfSales?.curPeriodAmount).toBe(54000);
        expect(totalCostOfSales?.curPeriodPercentage).toBeCloseTo((54000 / 204000) * 100, 0);
        /**
         * Info: (20241017 - Murky)
         * @description 5000 營業成本合計
         * @note 算錯成108000須糾正
         */
        const totalOperatingCost = general.find((detail) => detail.code === '5000');
        expect(totalOperatingCost).toBeDefined();
        expect(totalOperatingCost?.curPeriodAmount).toBe(54000);
        expect(totalOperatingCost?.curPeriodPercentage).toBeCloseTo((54000 / 204000) * 100, 0);

        /**
         * Info: (20241017 - Murky)
         * @description 5950 營業毛利(毛損)淨額
         * @note 包含母子公司之間的 未實現予以實現的銷貨(損)益
         */
        const grossProfitFromOperation = general.find((detail) => detail.code === '5950');
        expect(grossProfitFromOperation).toBeDefined();
        expect(grossProfitFromOperation?.curPeriodAmount).toBe(150000);
        expect(grossProfitFromOperation?.curPeriodPercentage).toBeCloseTo(
          (150000 / 204000) * 100,
          0
        );

        /**
         * Info: (20241017 - Murky)
         * @description 6200 管理費用
         */
        const administrativeExpenses = general.find((detail) => detail.code === '6200');
        expect(administrativeExpenses).toBeDefined();
        expect(administrativeExpenses?.curPeriodAmount).toBe(76000);
        expect(administrativeExpenses?.curPeriodPercentage).toBeCloseTo((76000 / 204000) * 100, 0);

        /**
         * Info: (20241017 - Murky)
         * @description 6000 營業費用合計
         */
        const totalOperatingExpense = general.find((detail) => detail.code === '6000');
        expect(totalOperatingExpense).toBeDefined();
        expect(totalOperatingExpense?.curPeriodAmount).toBe(76000);
        expect(totalOperatingExpense?.curPeriodPercentage).toBeCloseTo((76000 / 204000) * 100, 0);

        /**
         * Info: (20241017 - Murky)
         * @description 6900 營業利益
         */
        const netOperatingIncome = general.find((detail) => detail.code === '6900');
        expect(netOperatingIncome).toBeDefined();
        expect(netOperatingIncome?.curPeriodAmount).toBe(74000);
        expect(netOperatingIncome?.curPeriodPercentage).toBeCloseTo((74000 / 204000) * 100, 0);

        /**
         * Info: (20241017 - Murky)
         * @description 7100 利息收入(total)
         */
        const totalInterestIncome = general.find((detail) => detail.code === '7100');
        expect(totalInterestIncome).toBeDefined();
        expect(totalInterestIncome?.curPeriodAmount).toBe(3000);
        expect(totalInterestIncome?.curPeriodPercentage).toBeCloseTo((3000 / 204000) * 100, 0);

        /**
         * Info: (20241017 - Murky)
         * @description 7000 營業外收入及支出合計
         */
        const totalNonOperatingIncomeAndExpenses = general.find((detail) => detail.code === '7000');
        expect(totalNonOperatingIncomeAndExpenses).toBeDefined();
        expect(totalNonOperatingIncomeAndExpenses?.curPeriodAmount).toBe(3000);
        expect(totalNonOperatingIncomeAndExpenses?.curPeriodPercentage).toBeCloseTo(
          (3000 / 204000) * 100,
          0
        );

        /**
         * Info: (20241017 - Murky)
         * @description 8000 繼續營業單位本期淨利（淨損）
         */
        const profitFromContinuingOperations = general.find((detail) => detail.code === '8000');
        expect(profitFromContinuingOperations).toBeDefined();
        expect(profitFromContinuingOperations?.curPeriodAmount).toBe(77000);
        expect(profitFromContinuingOperations?.curPeriodPercentage).toBeCloseTo(
          (77000 / 204000) * 100,
          0
        );
        /**
         * Info: (20241017 - Murky)
         * @description 8200 本期淨利
         */
        const profitLoss = general.find((detail) => detail.code === '8200');
        expect(profitLoss).toBeDefined();
        expect(profitLoss?.curPeriodAmount).toBe(77000);
        expect(profitLoss?.curPeriodPercentage).toBeCloseTo((77000 / 204000) * 100, 0);

        // Info: (20241018 - Murky) Other Info
        expect(otherInfo).toBeDefined();
        const { revenueAndExpenseRatio } = otherInfo;
        const { curRatio } = revenueAndExpenseRatio.ratio;
        expect(curRatio).toBeDefined();
        expect(curRatio).toBeCloseTo(1.57, 1);
      });
    });

    describe('cash flow statement handler', () => {
      // Info: (20241017 - Murky) 2024/01/01 ~ 2024/06/31
      const mockStartDate = timestampInSeconds(1704038400000); // (new Date(2024, 0, 1, 0, 0, 0).getTime());
      const mockEndDate = timestampInSeconds(1719849599000); // new Date(2024, 0, 31, 23, 59, 59).getTime());
      it('should calculate correct answer', async () => {
        const { payload } = await cashFlowHandler({
          companyId: mockCompany.id,
          startDate: mockStartDate,
          endDate: mockEndDate,
          language: 'en',
        });

        // Info: (20241017 - Murky) Payload 存在
        expect(payload).toBeDefined();

        const { general, details } = payload as FinancialReport;

        // Info: (20241017 - Murky) General 與 details account 都有值
        expect(general.length).toBeGreaterThan(0);
        expect(details.length).toBeGreaterThan(0);

        /**
         * Info: (20241017 - Murky)
         * @description A10000 本期稅前淨利（淨損）
         */
        const profitBeforeTax = general.find((detail) => detail.code === 'A10000');
        expect(profitBeforeTax).toBeDefined();
        expect(profitBeforeTax?.curPeriodAmount).toBe(77000);

        /**
         * Info: (20241017 - Murky)
         * @description A33500 退還（支付）所得稅
         */
        const incomeTaxRefundPayment = details.find((detail) => detail.code === 'A33500');
        expect(incomeTaxRefundPayment).toBeDefined();
        expect(incomeTaxRefundPayment?.curPeriodAmount).toBe(-500);

        /**
         * Info: (20241017 - Murky)
         * @description E00100 期初現金及約當現金餘額
         */
        const cashAndCashEquivalentsAtBeginningOfPeriod = general.find(
          (detail) => detail.code === 'E00100'
        );
        expect(cashAndCashEquivalentsAtBeginningOfPeriod).toBeDefined();
        expect(cashAndCashEquivalentsAtBeginningOfPeriod?.curPeriodAmount).toBe(126000);

        /**
         * Info: (20241017 - Murky)
         * @description E00200 期末現金及約當現金餘額
         */
        const cashAndCashEquivalentsAtEndOfPeriod = general.find(
          (detail) => detail.code === 'E00200'
        );
        expect(cashAndCashEquivalentsAtEndOfPeriod).toBeDefined();
        expect(cashAndCashEquivalentsAtEndOfPeriod?.curPeriodAmount).toBe(52500);
        /**
         * Info: (20241017 - Murky)
         * @description EEEE 本期現金及約當現金增加（減少）數
         */
        const netIncreaseInCashAndCashEquivalents = general.find(
          (detail) => detail.code === 'EEEE'
        );
        expect(netIncreaseInCashAndCashEquivalents).toBeDefined();
        expect(netIncreaseInCashAndCashEquivalents?.curPeriodAmount).toBe(-73500);
      });
    });
  });
});
