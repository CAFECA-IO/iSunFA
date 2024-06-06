import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

const companyData = [
  { id: -5, name: 'ASDF', code: '2024060599995', regional: 'Taiwan', kycStatus: false, startDate: 1717558732, createdAt: 1717558732, updatedAt: 1717558732 },
];

const projectsData = [
  { id: -1, companyId: -5, name: 'iSunFA', completedPercent: 30, stage: 'Designing', imageId: 'ISF', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -2, companyId: -5, name: 'BAIFA', completedPercent: 80, stage: 'Beta Testing', imageId: 'BF', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -3, companyId: -5, name: 'iSunOne', completedPercent: 60, stage: 'Develop', imageId: 'ISO', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -4, companyId: -5, name: 'TideBit', completedPercent: 98, stage: 'Sold', imageId: 'TB', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -5, companyId: -5, name: 'ProjectE', completedPercent: 95, stage: 'Selling', imageId: 'E', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -6, companyId: -5, name: 'ProjectF', completedPercent: 100, stage: 'Archived', imageId: 'F', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -7, companyId: -5, name: 'ProjectG', completedPercent: 70, stage: 'Develop', imageId: 'G', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -8, companyId: -5, name: 'ProjectH', completedPercent: 85, stage: 'Beta Testing', imageId: 'H', createdAt: 1651368365, updatedAt: 1651368365 }
];

const projectIncomeExpensesData = [
  { id: -1, createdAt: 1682933165, updatedAt: 1682933165, income: 500, expense: 400, projectId: -1 },
  { id: -2, createdAt: 1711911019, updatedAt: 1711911019, income: 1010, expense: 510, projectId: -1 },
  { id: -3, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -1 },
  { id: -4, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -1 },
  { id: -5, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -1 },
  { id: -6, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -1 },
  { id: -7, createdAt: 1711911019, updatedAt: 1711911019, income: 1020, expense: 520, projectId: -2 },
  { id: -8, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -2 },
  { id: -9, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -2 },
  { id: -10, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -2 },
  { id: -11, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -2 },
  { id: -12, createdAt: 1711911019, updatedAt: 1711911019, income: 1030, expense: 530, projectId: -3 },
  { id: -13, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -3 },
  { id: -14, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -3 },
  { id: -15, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -3 },
  { id: -16, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -3 },
  { id: -17, createdAt: 1711911019, updatedAt: 1711911019, income: 1040, expense: 540, projectId: -4 },
  { id: -18, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -4 },
  { id: -19, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -4 },
  { id: -20, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -4 },
  { id: -21, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -4 },
  { id: -22, createdAt: 1711911019, updatedAt: 1711911019, income: 1050, expense: 550, projectId: -5 },
  { id: -23, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -5 },
  { id: -24, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -5 },
  { id: -25, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -5 },
  { id: -26, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -5 },
  { id: -27, createdAt: 1711911019, updatedAt: 1711911019, income: 1060, expense: 560, projectId: -6 },
  { id: -28, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -6 },
  { id: -29, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -6 },
  { id: -30, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -6 },
  { id: -31, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -6 },
  { id: -32, createdAt: 1711911019, updatedAt: 1711911019, income: 1070, expense: 570, projectId: -7 },
  { id: -33, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -7 },
  { id: -34, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -7 },
  { id: -35, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -7 },
  { id: -36, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -7 },
  { id: -37, createdAt: 1711911019, updatedAt: 1711911019, income: 1080, expense: 580, projectId: -8 },
  { id: -38, createdAt: 1711997419, updatedAt: 1711997419, income: 1000, expense: 500, projectId: -8 },
  { id: -39, createdAt: 1712083819, updatedAt: 1712083819, income: 1000, expense: 500, projectId: -8 },
  { id: -40, createdAt: 1712170219, updatedAt: 1712170219, income: 1000, expense: 500, projectId: -8 },
  { id: -41, createdAt: 1712256619, updatedAt: 1712256619, income: 1000, expense: 500, projectId: -8 },
  { id: -42, createdAt: 1716788550, updatedAt: 1716788550, income: 1000, expense: 880, projectId: -8 },
  { id: -43, createdAt: 1716702619, updatedAt: 1716702619, income: 1000, expense: 900, projectId: -8 },
  { id: -44, createdAt: 1706766619, updatedAt: 1706766619, income: 200, expense: 100, projectId: -1 },
  { id: -45, createdAt: 1709272219, updatedAt: 1709272219, income: 300, expense: 200, projectId: -1 },
  { id: -46, createdAt: 1711963565, updatedAt: 1711963565, income: 400, expense: 300, projectId: -1 },
  { id: -47, createdAt: 1714555565, updatedAt: 1714555565, income: 500, expense: 400, projectId: -1 },
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
    const expectedPayload = expect.objectContaining({
      profitChange: expect.any(Number),
      topProjectRoi: expect.any(Number),
      preLaunchProject: expect.any(Number),
    });
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
  it('should handle invalid method requests', async () => {
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
