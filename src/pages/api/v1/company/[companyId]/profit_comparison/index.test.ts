import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

const companyData = [
  {
    id: 10000003,
    name: 'ASDF',
    code: '2024060599993',
    regional: 'Taiwan',
    kycStatus: false,
    startDate: 1717558732,
    createdAt: 1717558732,
    updatedAt: 1717558732,
  },
];

const projectsData = [
  {
    id: 100000031,
    companyId: 10000003,
    name: 'iSunFA',
    completedPercent: 30,
    stage: 'Designing',
    imageId: 'ISF',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 100000032,
    companyId: 10000003,
    name: 'BAIFA',
    completedPercent: 80,
    stage: 'Beta Testing',
    imageId: 'BF',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 100000033,
    companyId: 10000003,
    name: 'iSunOne',
    completedPercent: 60,
    stage: 'Develop',
    imageId: 'ISO',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 100000034,
    companyId: 10000003,
    name: 'TideBit',
    completedPercent: 98,
    stage: 'Sold',
    imageId: 'TB',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 100000035,
    companyId: 10000003,
    name: 'ProjectE',
    completedPercent: 95,
    stage: 'Selling',
    imageId: 'E',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 100000036,
    companyId: 10000003,
    name: 'ProjectF',
    completedPercent: 100,
    stage: 'Archived',
    imageId: 'F',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 100000037,
    companyId: 10000003,
    name: 'ProjectG',
    completedPercent: 70,
    stage: 'Develop',
    imageId: 'G',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 100000038,
    companyId: 10000003,
    name: 'ProjectH',
    completedPercent: 85,
    stage: 'Beta Testing',
    imageId: 'H',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
];

const projectIncomeExpensesData = [
  {
    id: 1000000891,
    createdAt: 1682933165,
    updatedAt: 1682933165,
    income: 500,
    expense: 400,
    projectId: 100000031,
  },
  {
    id: 1000000892,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1010,
    expense: 510,
    projectId: 100000031,
  },
  {
    id: 1000000893,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 100000031,
  },
  {
    id: 1000000894,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 100000031,
  },
  {
    id: 1000000895,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 100000031,
  },
  {
    id: 1000000896,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 100000031,
  },
  {
    id: 1000000897,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1020,
    expense: 520,
    projectId: 100000032,
  },
  {
    id: 1000000898,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 100000032,
  },
  {
    id: 1000000899,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 100000032,
  },
  {
    id: 999998910,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 100000032,
  },
  {
    id: 999998911,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 100000032,
  },
  {
    id: 999998912,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1030,
    expense: 530,
    projectId: 100000033,
  },
  {
    id: 999998913,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 100000033,
  },
  {
    id: 999998914,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 100000033,
  },
  {
    id: 999998915,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 100000033,
  },
  {
    id: 999998916,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 100000033,
  },
  {
    id: 999998917,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1040,
    expense: 540,
    projectId: 100000034,
  },
  {
    id: 999998918,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 100000034,
  },
  {
    id: 999998919,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 100000034,
  },
  {
    id: 999998920,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 100000034,
  },
  {
    id: 999998921,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 100000034,
  },
  {
    id: 999998922,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1050,
    expense: 550,
    projectId: 100000035,
  },
  {
    id: 999998923,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 100000035,
  },
  {
    id: 999998924,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 100000035,
  },
  {
    id: 999998925,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 100000035,
  },
  {
    id: 999998926,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 100000035,
  },
  {
    id: 999998927,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1060,
    expense: 560,
    projectId: 100000036,
  },
  {
    id: 999998928,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 100000036,
  },
  {
    id: 999998929,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 100000036,
  },
  {
    id: 999998930,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 100000036,
  },
  {
    id: 999998931,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 100000036,
  },
  {
    id: 999998932,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1070,
    expense: 570,
    projectId: 100000037,
  },
  {
    id: 999998933,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 100000037,
  },
  {
    id: 999998934,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 100000037,
  },
  {
    id: 999998935,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 100000037,
  },
  {
    id: 999998936,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 100000037,
  },
  {
    id: 999998937,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1080,
    expense: 580,
    projectId: 100000038,
  },
  {
    id: 999998938,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 100000038,
  },
  {
    id: 999998939,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 100000038,
  },
  {
    id: 999998940,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 100000038,
  },
  {
    id: 999998941,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 100000038,
  },
  {
    id: 999998942,
    createdAt: 1716788550,
    updatedAt: 1716788550,
    income: 1000,
    expense: 880,
    projectId: 100000038,
  },
  {
    id: 999998943,
    createdAt: 1716702619,
    updatedAt: 1716702619,
    income: 1000,
    expense: 900,
    projectId: 100000038,
  },
  {
    id: 999998944,
    createdAt: 1706766619,
    updatedAt: 1706766619,
    income: 200,
    expense: 100,
    projectId: 100000031,
  },
  {
    id: 999998945,
    createdAt: 1709272219,
    updatedAt: 1709272219,
    income: 300,
    expense: 200,
    projectId: 100000031,
  },
  {
    id: 999998946,
    createdAt: 1711963565,
    updatedAt: 1711963565,
    income: 400,
    expense: 300,
    projectId: 100000031,
  },
  {
    id: 999998947,
    createdAt: 1714555565,
    updatedAt: 1714555565,
    income: 500,
    expense: 400,
    projectId: 100000031,
  },
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
    req.method = 'GET';
    req.query = {
      currentPage: '1',
      itemsPerPage: '10',
      startDate: '2024-04-01',
      endDate: '2024-05-01',
    };
    await prisma.company.createMany({ data: companyData });
    await prisma.project.createMany({ data: projectsData });
    await prisma.incomeExpense.createMany({ data: projectIncomeExpensesData });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const category = expect.any(String);
    const aSeries = expect.arrayContaining([expect.any(Number)]);
    const expectedPayload = expect.objectContaining({
      startDate: expect.any(Number),
      endDate: expect.any(Number),
      currentPage: expect.any(Number),
      totalPages: expect.any(Number),
      categories: expect.arrayContaining([category]),
      series: expect.arrayContaining([aSeries]),
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
    await prisma.incomeExpense.deleteMany({
      where: { id: { in: projectIncomeExpensesData.map((ele) => ele.id) } },
    });
    await prisma.project.deleteMany({ where: { id: { in: projectsData.map((ele) => ele.id) } } });
    await prisma.company.deleteMany({ where: { id: { in: companyData.map((ele) => ele.id) } } });
  });
  it('should return error if some query element is missing', async () => {
    req.method = 'GET';
    req.query = { page: '1', limit: '10' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('422'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });
});
