import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import handler from '@/pages/api/v1/company/[companyId]/project_progress/index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

const milestones = [
  {
    projectId: 100000011,
    startDate: 1709578219,
    endDate: 1712256619,
    status: 'Designing',
    createdAt: 1709578219,
    updatedAt: 1709578219,
  },
  {
    projectId: 100000012,
    startDate: 1709578219,
    endDate: 1712256619,
    status: 'Beta Testing',
    createdAt: 1709578219,
    updatedAt: 1709578219,
  },
  {
    projectId: 100000013,
    startDate: 1709578219,
    endDate: 1712256619,
    status: 'Develop',
    createdAt: 1709578219,
    updatedAt: 1709578219,
  },
  {
    projectId: 100000014,
    startDate: 1709578219,
    endDate: 1712256619,
    status: 'Sold',
    createdAt: 1709578219,
    updatedAt: 1709578219,
  },
  {
    projectId: 100000015,
    startDate: 1709578219,
    endDate: 1712256619,
    status: 'Selling',
    createdAt: 1709578219,
    updatedAt: 1709578219,
  },
  {
    projectId: 100000016,
    startDate: 1709578219,
    endDate: 1712256619,
    status: 'Archived',
    createdAt: 1709578219,
    updatedAt: 1709578219,
  },
  {
    projectId: 100000017,
    startDate: 1709578219,
    endDate: 1712256619,
    status: 'Beta Testing',
    createdAt: 1709578219,
    updatedAt: 1709578219,
  },
  {
    projectId: 100000018,
    startDate: 1709578219,
    endDate: 1712256619,
    status: 'Develop',
    createdAt: 1709578219,
    updatedAt: 1709578219,
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

xdescribe('Result API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    req.method = 'GET';
    req.query = { date: '2024-03-07' };
    await prisma.company.createMany({ data: companyData });
    await prisma.project.createMany({ data: projectsData });
    await prisma.milestone.createMany({ data: milestones });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const category = expect.any(String);
    const aSeries = expect.objectContaining({
      name: expect.any(String),
      data: expect.arrayContaining([expect.any(Number)]),
    });
    const expectedPayload = expect.objectContaining({
      date: expect.any(Number),
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
    await prisma.milestone.deleteMany({
      where: { projectId: { in: milestones.map((ele) => ele.projectId) } },
    });
    await prisma.project.deleteMany({ where: { id: { in: projectsData.map((ele) => ele.id) } } });
    await prisma.company.deleteMany({ where: { id: { in: companyData.map((ele) => ele.id) } } });
  });
  it('should return error if some query element is missing', async () => {
    req.method = 'GET';
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
