import { NextApiRequest, NextApiResponse } from 'next';
import { IRole } from '@/interfaces/role';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let role: IRole;

beforeEach(async () => {
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
  role = (await prisma.role.findFirst({
    where: {
      name: 'TST_KING1',
    },
  })) as IRole;
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  if (!role) {
    role = await prisma.role.create({
      data: {
        name: 'TST_KING1',
        permissions: ['READ', 'WRITE'],
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });
  }
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await prisma.role.delete({
      where: {
        id: role.id,
      },
    });
  } catch (error) {
    // Info: (20240515 - Jacky) If already deleted, ignore the error.
  }
});

describe('test role API handler', () => {
  it('should list all roles', async () => {
    req.method = 'GET';
    await handler(req, res);
    const expectedRole = expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      permissions: expect.arrayContaining([expect.any(String)]),
    });
    const expectedRoleList = expect.arrayContaining([expectedRole]);
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedRoleList,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should create role successfully', async () => {
    req.method = 'POST';
    req.body = {
      name: 'test_queen',
    };
    await handler(req, res);
    const expectedRole = expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      permissions: expect.arrayContaining([expect.any(String)]),
    });
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('201'),
      message: expect.any(String),
      payload: expectedRole,
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
    await prisma.role.delete({
      where: {
        id: res.json.mock.calls[0][0].payload.id,
      },
    });
  });

  it('should return error for missing input parameters', async () => {
    req.method = 'POST';
    req.body = {
      // name: 'John Doe',
    };
    await handler(req, res);
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should return error for METHOD_NOT_ALLOWED', async () => {
    req.method = 'PUT';
    await handler(req, res);
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('405'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });
});
