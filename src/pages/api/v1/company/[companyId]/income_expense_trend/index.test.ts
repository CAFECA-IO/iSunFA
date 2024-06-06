import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

const companyData = [
  { id: -2, name: 'ASDF', code: '202406059999', regional: 'Taiwan', kycStatus: false, startDate: 1717558732, createdAt: 1717558732, updatedAt: 1717558732 },
];

const projectsData = [
  { id: -21, companyId: -2, name: 'iSunFA', completedPercent: 30, stage: 'Designing', imageId: 'ISF', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -22, companyId: -2, name: 'BAIFA', completedPercent: 80, stage: 'Beta Testing', imageId: 'BF', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -23, companyId: -2, name: 'iSunOne', completedPercent: 60, stage: 'Develop', imageId: 'ISO', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -24, companyId: -2, name: 'TideBit', completedPercent: 98, stage: 'Sold', imageId: 'TB', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -25, companyId: -2, name: 'ProjectE', completedPercent: 95, stage: 'Selling', imageId: 'E', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -26, companyId: -2, name: 'ProjectF', completedPercent: 100, stage: 'Archived', imageId: 'F', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -27, companyId: -2, name: 'ProjectG', completedPercent: 70, stage: 'Develop', imageId: 'G', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -28, companyId: -2, name: 'ProjectH', completedPercent: 85, stage: 'Beta Testing', imageId: 'H', createdAt: 1651368365, updatedAt: 1651368365 }
];

const projectIncomeExpensesData = [
  { id: -91, createdAt: 1682933165, updatedAt: 1682933165, income: 500, expense: 400, projectId: -21 },
  { id: -92, createdAt: 1711911019, updatedAt: 1711911019, income: 1010, expense: 510, projectId: -21 },
  { id: -93, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -21 },
  { id: -94, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -21 },
  { id: -95, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -21 },
  { id: -96, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -21 },
  { id: -97, createdAt: 1711911019, updatedAt: 1711911019, income: 1020, expense: 520, projectId: -22 },
  { id: -98, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -22 },
  { id: -99, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -22 },
  { id: -910, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -22 },
  { id: -911, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -22 },
  { id: -912, createdAt: 1711911019, updatedAt: 1711911019, income: 1030, expense: 530, projectId: -23 },
  { id: -913, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -23 },
  { id: -914, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -23 },
  { id: -915, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -23 },
  { id: -916, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -23 },
  { id: -917, createdAt: 1711911019, updatedAt: 1711911019, income: 1040, expense: 540, projectId: -24 },
  { id: -918, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -24 },
  { id: -919, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -24 },
  { id: -920, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -24 },
  { id: -921, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -24 },
  { id: -922, createdAt: 1711911019, updatedAt: 1711911019, income: 1050, expense: 550, projectId: -25 },
  { id: -923, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -25 },
  { id: -924, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -25 },
  { id: -925, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -25 },
  { id: -926, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -25 },
  { id: -927, createdAt: 1711911019, updatedAt: 1711911019, income: 1060, expense: 560, projectId: -26 },
  { id: -928, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -26 },
  { id: -929, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -26 },
  { id: -930, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -26 },
  { id: -931, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -26 },
  { id: -932, createdAt: 1711911019, updatedAt: 1711911019, income: 1070, expense: 570, projectId: -27 },
  { id: -933, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -27 },
  { id: -934, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -27 },
  { id: -935, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -27 },
  { id: -936, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -27 },
  { id: -937, createdAt: 1711911019, updatedAt: 1711911019, income: 1080, expense: 580, projectId: -28 },
  { id: -938, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -28 },
  { id: -939, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -28 },
  { id: -940, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -28 },
  { id: -941, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -28 },
  { id: -942, createdAt: 1716788550, updatedAt: 1716788550, income: 1000, expense: 880, projectId: -28 },
  { id: -943, createdAt: 1716702619, updatedAt: 1716702619, income: 1000, expense: 900, projectId: -28 },
  { id: -944, createdAt: 1706766619, updatedAt: 1706766619, income: 200, expense: 100, projectId: -21 },
  { id: -945, createdAt: 1709272219, updatedAt: 1709272219, income: 300, expense: 200, projectId: -21 },
  { id: -946, createdAt: 1711963565, updatedAt: 1711963565, income: 400, expense: 300, projectId: -21 },
  { id: -947, createdAt: 1714555565, updatedAt: 1714555565, income: 500, expense: 400, projectId: -21 },
];

beforeEach(() => {
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

afterEach(() => {
  jest.clearAllMocks();
});

describe('Result API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    await prisma.company.createMany({ data: companyData });
    await prisma.project.createMany({ data: projectsData });
    await prisma.incomeExpense.createMany({ data: projectIncomeExpensesData });
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const category = expect.any(String);
    const aSeries = expect.objectContaining({
      name: expect.any(String),
      data: expect.arrayContaining([expect.any(Number)]),
    });
    const absolute = expect.objectContaining({
      absolute: expect.any(Number),
    });
    const annotation = expect.objectContaining({
      name: expect.any(String),
      data: expect.arrayContaining([absolute]),
    });
    const expectedPayload = {
      categories: expect.arrayContaining([category]),
      series: expect.arrayContaining([
        aSeries,
      ]),
      annotations: expect.arrayContaining([
        annotation,
      ]),
    };
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expectedPayload,
      })
    );
    await prisma.incomeExpense.deleteMany(
      { where: { id: { in: projectIncomeExpensesData.map((ele) => ele.id) } } }
    );
    await prisma.project.deleteMany(
      { where: { id: { in: projectsData.map((ele) => ele.id) } } }
    );
    await prisma.company.deleteMany(
      { where: { id: { in: companyData.map((ele) => ele.id) } } }
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
