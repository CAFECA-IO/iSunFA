import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

const companyData = [
  {
    id: 10000005,
    name: 'ASDF',
    code: '2024060599995',
    regional: 'Taiwan',
    kycStatus: false,
    startDate: 1717558732,
    createdAt: 1717558732,
    updatedAt: 1717558732,
  },
];

const projectsData = [
  {
    id: 10000001,
    companyId: 10000005,
    name: 'iSunFA',
    completedPercent: 30,
    stage: 'Designing',
    imageId: 'ISF',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 10000002,
    companyId: 10000005,
    name: 'BAIFA',
    completedPercent: 80,
    stage: 'Beta Testing',
    imageId: 'BF',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 10000003,
    companyId: 10000005,
    name: 'iSunOne',
    completedPercent: 60,
    stage: 'Develop',
    imageId: 'ISO',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 10000004,
    companyId: 10000005,
    name: 'TideBit',
    completedPercent: 98,
    stage: 'Sold',
    imageId: 'TB',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 10000005,
    companyId: 10000005,
    name: 'ProjectE',
    completedPercent: 95,
    stage: 'Selling',
    imageId: 'E',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 10000006,
    companyId: 10000005,
    name: 'ProjectF',
    completedPercent: 100,
    stage: 'Archived',
    imageId: 'F',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 10000007,
    companyId: 10000005,
    name: 'ProjectG',
    completedPercent: 70,
    stage: 'Develop',
    imageId: 'G',
    createdAt: 1651368365,
    updatedAt: 1651368365,
  },
  {
    id: 10000008,
    companyId: 10000005,
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
    id: 10000001,
    createdAt: 1682933165,
    updatedAt: 1682933165,
    income: 500,
    expense: 400,
    projectId: 10000001,
  },
  {
    id: 10000002,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1010,
    expense: 510,
    projectId: 10000001,
  },
  {
    id: 10000003,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 10000001,
  },
  {
    id: 10000004,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 10000001,
  },
  {
    id: 10000005,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 10000001,
  },
  {
    id: 10000006,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 10000001,
  },
  {
    id: 10000007,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1020,
    expense: 520,
    projectId: 10000002,
  },
  {
    id: 10000008,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 10000002,
  },
  {
    id: 10000009,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 10000002,
  },
  {
    id: 100000010,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 10000002,
  },
  {
    id: 100000011,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 10000002,
  },
  {
    id: 100000012,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1030,
    expense: 530,
    projectId: 10000003,
  },
  {
    id: 100000013,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 10000003,
  },
  {
    id: 100000014,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 10000003,
  },
  {
    id: 100000015,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 10000003,
  },
  {
    id: 100000016,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 10000003,
  },
  {
    id: 100000017,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1040,
    expense: 540,
    projectId: 10000004,
  },
  {
    id: 100000018,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 10000004,
  },
  {
    id: 100000019,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 10000004,
  },
  {
    id: 100000020,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 10000004,
  },
  {
    id: 100000021,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 10000004,
  },
  {
    id: 100000022,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1050,
    expense: 550,
    projectId: 10000005,
  },
  {
    id: 100000023,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 10000005,
  },
  {
    id: 100000024,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 10000005,
  },
  {
    id: 100000025,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 10000005,
  },
  {
    id: 100000026,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 10000005,
  },
  {
    id: 100000027,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1060,
    expense: 560,
    projectId: 10000006,
  },
  {
    id: 100000028,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 10000006,
  },
  {
    id: 100000029,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 10000006,
  },
  {
    id: 100000030,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 10000006,
  },
  {
    id: 100000031,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 10000006,
  },
  {
    id: 100000032,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1070,
    expense: 570,
    projectId: 10000007,
  },
  {
    id: 100000033,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 10000007,
  },
  {
    id: 100000034,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 10000007,
  },
  {
    id: 100000035,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 10000007,
  },
  {
    id: 100000036,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 10000007,
  },
  {
    id: 100000037,
    createdAt: 1711911019,
    updatedAt: 1711911019,
    income: 1080,
    expense: 580,
    projectId: 10000008,
  },
  {
    id: 100000038,
    createdAt: 1711997419,
    updatedAt: 1711997419,
    income: 1000,
    expense: 500,
    projectId: 10000008,
  },
  {
    id: 100000039,
    createdAt: 1712083819,
    updatedAt: 1712083819,
    income: 1000,
    expense: 500,
    projectId: 10000008,
  },
  {
    id: 100000040,
    createdAt: 1712170219,
    updatedAt: 1712170219,
    income: 1000,
    expense: 500,
    projectId: 10000008,
  },
  {
    id: 100000041,
    createdAt: 1712256619,
    updatedAt: 1712256619,
    income: 1000,
    expense: 500,
    projectId: 10000008,
  },
  {
    id: 100000042,
    createdAt: 1716788550,
    updatedAt: 1716788550,
    income: 1000,
    expense: 880,
    projectId: 10000008,
  },
  {
    id: 100000043,
    createdAt: 1716702619,
    updatedAt: 1716702619,
    income: 1000,
    expense: 900,
    projectId: 10000008,
  },
  {
    id: 100000044,
    createdAt: 1706766619,
    updatedAt: 1706766619,
    income: 200,
    expense: 100,
    projectId: 10000001,
  },
  {
    id: 100000045,
    createdAt: 1709272219,
    updatedAt: 1709272219,
    income: 300,
    expense: 200,
    projectId: 10000001,
  },
  {
    id: 100000046,
    createdAt: 1711963565,
    updatedAt: 1711963565,
    income: 400,
    expense: 300,
    projectId: 10000001,
  },
  {
    id: 100000047,
    createdAt: 1714555565,
    updatedAt: 1714555565,
    income: 500,
    expense: 400,
    projectId: 10000001,
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
    await prisma.incomeExpense.deleteMany({
      where: { id: { in: projectIncomeExpensesData.map((ele) => ele.id) } },
    });
    await prisma.project.deleteMany({ where: { id: { in: projectsData.map((ele) => ele.id) } } });
    await prisma.company.deleteMany({ where: { id: { in: companyData.map((ele) => ele.id) } } });
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
