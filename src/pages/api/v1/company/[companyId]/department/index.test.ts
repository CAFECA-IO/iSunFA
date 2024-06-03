import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let departmentsId: number[];
let companyId: number;

beforeEach(async () => {
  req = {
    headers: {},
    query: {},
    method: 'GET',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;

  let company = await prisma.company.findFirst({
    where: {
      code: 'TST_department1',
    },
  });
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  if (!company) {
    company = await prisma.company.create({
      data: {
        code: 'TST_department1',
        name: 'Test Company',
        regional: 'TW',
        startDate: nowTimestamp,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });
  }
  companyId = company.id;
  await prisma.department.createMany({
    data: [
      { name: 'HR', companyId, createdAt: nowTimestamp, updatedAt: nowTimestamp },
      { name: 'Finance', companyId, createdAt: nowTimestamp, updatedAt: nowTimestamp },
      { name: 'IT', companyId, createdAt: nowTimestamp, updatedAt: nowTimestamp },
      { name: 'Marketing', companyId, createdAt: nowTimestamp, updatedAt: nowTimestamp },
    ],
  });
  const departments = await prisma.department.findMany({
    where: {
      companyId: 14,
    },
  });
  departmentsId = departments.map((department) => department.id);
});

afterEach(async () => {
  await prisma.department.deleteMany({
    where: {
      id: {
        in: departmentsId,
      },
    },
  });
  jest.clearAllMocks();
});

describe('getAllDepartments API Handler Tests', () => {
  it('should return all departments information', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const expectedPayload = expect.arrayContaining([expect.any(String)]);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expectedPayload,
      })
    );
  });
  it('should return error if method is not GET', async () => {
    req.method = 'POST';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('405'),
      message: expect.any(String),
      payload: expect.any(Object),
    });
  });
});
