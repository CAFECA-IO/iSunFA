import { NextApiRequest, NextApiResponse } from 'next';
import { ReportKind } from '@/interfaces/report_item';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import prisma from '@/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

const dummyGeneratedReportItems = [
  {
    id: -6,
    name: 'Cash Flow Balance Sheet-20240423-1-20240420-1',
    from: 1715616000,
    to: 1718208000,
    reportLink: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    downloadLink: 'https://BFample.com/download/report.pdf',
    evidenceId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    blockChainExplorerLink: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    reportType: FinancialReportTypesKey.balance_sheet,
    type: ReportKind.financial,
    status: 'generated',
    createdAt: 1713815673,
    updatedAt: 1713815673
  },
  {
    id: -7,
    name: 'Cash Flow Statement-20240420-1',
    from: 1715529600,
    to: 1718121600,
    projectId: -1,
    reportLink: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    downloadLink: 'https://BFample.com/download/report.pdf',
    evidenceId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    blockChainExplorerLink: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    reportType: FinancialReportTypesKey.cash_flow_statement,
    type: ReportKind.financial,
    status: 'generated',
    createdAt: 1713543101,
    updatedAt: 1713543101
  },
  {
    id: -8,
    name: 'Balance Sheet-20240427-1',
    projectId: -2,
    reportLink: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    downloadLink: 'https://BFample.com/download/report.pdf',
    evidenceId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    blockChainExplorerLink: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    reportType: FinancialReportTypesKey.balance_sheet,
    type: ReportKind.financial,
    from: 1715443200,
    to: 1718035200,
    status: 'generated',
    createdAt: 1714220640,
    updatedAt: 1714220640
  },
  {
    id: -9,
    name: 'Comprehensive Income Statement-20240422-1',
    reportLink: '505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000011111111111111111111111117',
    downloadLink: 'https://BFample.com/download/report.pdf',
    evidenceId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c109111111111111111111111111111111111111117',
    blockChainExplorerLink: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007',
    reportType: FinancialReportTypesKey.comprehensive_income_statement,
    type: ReportKind.financial,
    from: 1715356800,
    to: 1717948800,
    status: 'generated',
    createdAt: 1713755682,
    updatedAt: 1713755682
  },
  {
    id: -10,
    name: 'Balance Sheet-20240429-1',
    projectId: -3,
    reportLink: '505c1ddbd5d6cb47fc769577d6afaa0410f5c109111111111111111111111111111111111111117',
    downloadLink: 'https://BFample.com/download/report.pdf',
    evidenceId: '505c1ddbd5d6cb47fc769577d6afaa0410f5c109111111111111111111111111111111111111117',
    blockChainExplorerLink: 'https://baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c109111111111111111111111111111111111111117',
    reportType: FinancialReportTypesKey.balance_sheet,
    type: ReportKind.financial,
    from: 1715270400,
    to: 1717862400,
    status: 'generated',
    createdAt: 1714331987,
    updatedAt: 1714331987
  },
];

const projects = [
  {
    id: -1,
    companyId: -100,
    name: 'iSunFA',
    completedPercent: 30,
    stage: 'Designing',
    createdAt: 1651368365,
    updatedAt: 1651368365,
    imageId: 'ISF'
  },
  {
    id: -2,
    companyId: -100,
    name: 'BAIFA',
    completedPercent: 80,
    stage: 'Beta Testing',
    createdAt: 1651368365,
    updatedAt: 1651368365,
    imageId: 'BF'
  },
  {
    id: -3,
    companyId: -100,
    name: 'iSunOne',
    completedPercent: 60,
    stage: 'Develop',
    createdAt: 1651368365,
    updatedAt: 1651368365,
    imageId: 'ISO'
  },
];

const company = {
  id: -100,
  name: 'Test Company',
  code: 'TST_company_user-100',
  regional: 'TW',
  startDate: 1717143507,
  createdAt: 1717143507,
  updatedAt: 1717143507
};

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

describe('generatedReports API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    await prisma.company.create({
      data: company,
    });
    await prisma.project.createMany({
      data: projects,
    });
    await prisma.report.createMany({
      data: dummyGeneratedReportItems,
    });
    req.method = 'GET';
    await handler(req, res);
    const responsePayload = res.json.mock.calls[0][0];
    responsePayload.payload.forEach((item: object) => {
      if ('project' in item && item.project !== null) {
        const projectInfo = {
          id: expect.any(String),
          name: expect.any(String),
          code: expect.any(String),
        };
        expect(item.project).toEqual(projectInfo);
      }
    });
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
      project: expect.anything(),
      reportType: expect.any(String),
      type: expect.any(String),
      reportLinkId: expect.any(String),
      downloadLink: expect.any(String),
      blockchainExplorerLink: expect.any(String),
      evidenceId: expect.any(String)
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
          in: dummyGeneratedReportItems.map((item) => item.id),
        },
      },
    });
    await prisma.project.deleteMany({
      where: {
        id: {
          in: projects.map((project) => project.id),
        },
      },
    });
    await prisma.company.delete({
      where: {
        id: company.id,
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
