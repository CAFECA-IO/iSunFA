import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
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

  const createdCompany = await prisma.company.create({
    data: {
      name: 'Test Company',
      code: 'TST',
      regional: 'TW',
    },
  });
  companyId = createdCompany.id;
  await prisma.department.createMany({
    data: [
      { name: 'HR', companyId },
      { name: 'Finance', companyId },
      { name: 'IT', companyId },
      { name: 'Marketing', companyId },
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
