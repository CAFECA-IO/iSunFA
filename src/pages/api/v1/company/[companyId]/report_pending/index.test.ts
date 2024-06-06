import { NextApiRequest, NextApiResponse } from 'next';
import { ReportKind } from '@/interfaces/report_item';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import prisma from '@/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

const dummyPendingReportItems = [
  {
    id: 8888871,
    name: 'Cash Flow Statement-20240420-1',
    from: 1683043200,
    to: 1704067200,
    remainingSeconds: 10,
    paused: false,
    reportType: FinancialReportTypesKey.cash_flow_statement,
    type: ReportKind.financial,
    status: 'pending',
    createdAt: 1713611226,
    updatedAt: 1713611226
  },
  {
    id: 8888872,
    name: 'Cash Flow Statement-20240505-1',
    from: 1695609600,
    to: 1698106883,
    remainingSeconds: 250,
    paused: true,
    reportType: FinancialReportTypesKey.cash_flow_statement,
    type: ReportKind.financial,
    status: 'pending',
    createdAt: 1714897574,
    updatedAt: 1714897574
  },
  {
    id: 8888873,
    name: 'Comprehensive Income Statement-20240412-1',
    remainingSeconds: 1615,
    paused: false,
    reportType: FinancialReportTypesKey.comprehensive_income_statement,
    type: ReportKind.financial,
    from: 1685721600,
    to: 1704076800,
    status: 'pending',
    createdAt: 1712863312,
    updatedAt: 1712863312
  },
  {
    id: 8888874,
    name: 'Balance Sheet-20240423-1',
    remainingSeconds: 3680,
    paused: false,
    reportType: FinancialReportTypesKey.balance_sheet,
    type: ReportKind.financial,
    from: 1693113600,
    to: 1704096000,
    status: 'pending',
    createdAt: 1713846643,
    updatedAt: 1713846643
  },
  {
    id: 8888875,
    name: 'Balance Sheet-20240501-1',
    remainingSeconds: 30,
    paused: false,
    reportType: FinancialReportTypesKey.balance_sheet,
    type: ReportKind.financial,
    from: 1698374400,
    to: 1714022400,
    status: 'pending',
    createdAt: 1714508675,
    updatedAt: 1714508675
  },
];

beforeEach(async () => {
  req = {
    headers: {},
    body: null,
    query: {},
    method: '',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(async () => {
  jest.clearAllMocks();
});

describe('pendingReports API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    await prisma.report.createMany({
      data: dummyPendingReportItems,
    });
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const period = {
      startTimestamp: expect.any(Number),
      endTimestamp: expect.any(Number),
    };
    const expectedStructure = expect.objectContaining({
      id: expect.any(String),
      name: expect.any(String),
      createdTimestamp: expect.any(Number),
      period: expect.objectContaining(period),
      reportType: expect.any(String),
      type: expect.any(String),
      paused: expect.any(Boolean),
      remainingSeconds: expect.any(Number),
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.arrayContaining([expectedStructure]),
      })
    );
    await prisma.report.deleteMany({
      where: {
        id: {
          in: dummyPendingReportItems.map((item) => item.id),
        },
      },
    });
  });
  it('should return [] if no data', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.any(Array),
      })
    );
  });
  it('should return error if not GET', async () => {
    req.method = 'POST';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('405'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });
});
