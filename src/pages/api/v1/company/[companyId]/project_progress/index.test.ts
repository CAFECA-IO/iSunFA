import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

const companyData = [
  { id: -4, name: 'ASDF', code: '2024060599994', regional: 'Taiwan', kycStatus: false, startDate: 1717558732, createdAt: 1717558732, updatedAt: 1717558732 },
];

const projectsData = [
  { id: -11, companyId: -4, name: 'iSunFA', completedPercent: 30, stage: 'Designing', imageId: 'ISF', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -12, companyId: -4, name: 'BAIFA', completedPercent: 80, stage: 'Beta Testing', imageId: 'BF', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -13, companyId: -4, name: 'iSunOne', completedPercent: 60, stage: 'Develop', imageId: 'ISO', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -14, companyId: -4, name: 'TideBit', completedPercent: 98, stage: 'Sold', imageId: 'TB', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -15, companyId: -4, name: 'ProjectE', completedPercent: 95, stage: 'Selling', imageId: 'E', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -16, companyId: -4, name: 'ProjectF', completedPercent: 100, stage: 'Archived', imageId: 'F', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -17, companyId: -4, name: 'ProjectG', completedPercent: 70, stage: 'Develop', imageId: 'G', createdAt: 1651368365, updatedAt: 1651368365 },
  { id: -18, companyId: -4, name: 'ProjectH', completedPercent: 85, stage: 'Beta Testing', imageId: 'H', createdAt: 1651368365, updatedAt: 1651368365 }
];

const milestones = [
  { projectId: -11, startDate: 1709578219, endDate: 1712256619, status: 'Designing', createdAt: 1709578219, updatedAt: 1709578219 },
  { projectId: -12, startDate: 1709578219, endDate: 1712256619, status: 'Beta Testing', createdAt: 1709578219, updatedAt: 1709578219 },
  { projectId: -13, startDate: 1709578219, endDate: 1712256619, status: 'Develop', createdAt: 1709578219, updatedAt: 1709578219 },
  { projectId: -14, startDate: 1709578219, endDate: 1712256619, status: 'Sold', createdAt: 1709578219, updatedAt: 1709578219 },
  { projectId: -15, startDate: 1709578219, endDate: 1712256619, status: 'Selling', createdAt: 1709578219, updatedAt: 1709578219 },
  { projectId: -16, startDate: 1709578219, endDate: 1712256619, status: 'Archived', createdAt: 1709578219, updatedAt: 1709578219 },
  { projectId: -17, startDate: 1709578219, endDate: 1712256619, status: 'Beta Testing', createdAt: 1709578219, updatedAt: 1709578219 },
  { projectId: -18, startDate: 1709578219, endDate: 1712256619, status: 'Develop', createdAt: 1709578219, updatedAt: 1709578219 }
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
      series: expect.arrayContaining([
        aSeries
      ]),
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
    await prisma.milestone.deleteMany(
      { where: { projectId: { in: milestones.map((ele) => ele.projectId) } } }
    );
    await prisma.project.deleteMany(
      { where: { id: { in: projectsData.map((ele) => ele.id) } } }
    );
    await prisma.company.deleteMany(
      { where: { id: { in: companyData.map((ele) => ele.id) } } }
    );
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
