import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

const companyData = [
  { id: 10000002, name: 'ASDF', code: '2024060599992', regional: 'Taiwan', kycStatus: false, startDate: 1717558732, createdAt: 1717558732, updatedAt: 1717558732 },
];

const projectsData = [
  { id: 100000021, companyId: 10000002, name: 'iSunFA', completedPercent: 30, stage: 'Designing', imageId: 'ISF', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: 100000022, companyId: 10000002, name: 'BAIFA', completedPercent: 80, stage: 'Beta Testing', imageId: 'BF', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: 100000023, companyId: 10000002, name: 'iSunOne', completedPercent: 60, stage: 'Develop', imageId: 'ISO', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: 100000024, companyId: 10000002, name: 'TideBit', completedPercent: 98, stage: 'Sold', imageId: 'TB', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: 100000025, companyId: 10000002, name: 'ProjectE', completedPercent: 95, stage: 'Selling', imageId: 'E', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: 100000026, companyId: 10000002, name: 'ProjectF', completedPercent: 100, stage: 'Archived', imageId: 'F', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: 100000027, companyId: 10000002, name: 'ProjectG', completedPercent: 70, stage: 'Develop', imageId: 'G', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: 100000028, companyId: 10000002, name: 'ProjectH', completedPercent: 85, stage: 'Beta Testing', imageId: 'H', createdAt: 1651368365, updatedAt: 1651368365 }
];

const projectIncomeExpensesData = [
  { id: 100000091, createdAt: 1682933165, updatedAt: 1682933165, income: 500, expense: 400, projectId: 100000021 },
  { id: 100000092, createdAt: 1711911019, updatedAt: 1711911019, income: 1010, expense: 510, projectId: 100000021 },
  { id: 100000093, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: 100000021 },
  { id: 100000094, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: 100000021 },
  { id: 100000095, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: 100000021 },
  { id: 100000096, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: 100000021 },
  { id: 100000097, createdAt: 1711911019, updatedAt: 1711911019, income: 1020, expense: 520, projectId: 100000022 },
  { id: 100000098, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: 100000022 },
  { id: 100000099, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: 100000022 },
  { id: 1000000910, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: 100000022 },
  { id: 1000000911, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: 100000022 },
  { id: 1000000912, createdAt: 1711911019, updatedAt: 1711911019, income: 1030, expense: 530, projectId: 100000023 },
  { id: 1000000913, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: 100000023 },
  { id: 1000000914, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: 100000023 },
  { id: 1000000915, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: 100000023 },
  { id: 1000000916, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: 100000023 },
  { id: 1000000917, createdAt: 1711911019, updatedAt: 1711911019, income: 1040, expense: 540, projectId: 100000024 },
  { id: 1000000918, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: 100000024 },
  { id: 1000000919, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: 100000024 },
  { id: 1000000920, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: 100000024 },
  { id: 1000000921, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: 100000024 },
  { id: 1000000922, createdAt: 1711911019, updatedAt: 1711911019, income: 1050, expense: 550, projectId: 100000025 },
  { id: 1000000923, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: 100000025 },
  { id: 1000000924, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: 100000025 },
  { id: 1000000925, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: 100000025 },
  { id: 1000000926, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: 100000025 },
  { id: 1000000927, createdAt: 1711911019, updatedAt: 1711911019, income: 1060, expense: 560, projectId: 100000026 },
  { id: 1000000928, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: 100000026 },
  { id: 1000000929, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: 100000026 },
  { id: 1000000930, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: 100000026 },
  { id: 1000000931, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: 100000026 },
  { id: 1000000932, createdAt: 1711911019, updatedAt: 1711911019, income: 1070, expense: 570, projectId: 100000027 },
  { id: 1000000933, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: 100000027 },
  { id: 1000000934, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: 100000027 },
  { id: 1000000935, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: 100000027 },
  { id: 1000000936, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: 100000027 },
  { id: 1000000937, createdAt: 1711911019, updatedAt: 1711911019, income: 1080, expense: 580, projectId: 100000028 },
  { id: 1000000938, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: 100000028 },
  { id: 1000000939, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: 100000028 },
  { id: 1000000940, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: 100000028 },
  { id: 1000000941, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: 100000028 },
  { id: 1000000942, createdAt: 1716788550, updatedAt: 1716788550, income: 1000, expense: 880, projectId: 100000028 },
  { id: 1000000943, createdAt: 1716702619, updatedAt: 1716702619, income: 1000, expense: 900, projectId: 100000028 },
  { id: 1000000944, createdAt: 1706766619, updatedAt: 1706766619, income: 200, expense: 100, projectId: 100000021 },
  { id: 1000000945, createdAt: 1709272219, updatedAt: 1709272219, income: 300, expense: 200, projectId: 100000021 },
  { id: 1000000946, createdAt: 1711963565, updatedAt: 1711963565, income: 400, expense: 300, projectId: 100000021 },
  { id: 1000000947, createdAt: 1714555565, updatedAt: 1714555565, income: 500, expense: 400, projectId: 100000021 },
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
