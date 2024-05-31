import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { IRole } from '@/interfaces/role';
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
      name: 'TST_KING2',
    },
  })) as IRole;
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  if (!role) {
    role = await prisma.role.create({
      data: {
        name: 'TST_KING2',
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

describe('test role API', () => {
  it('should get role by id', async () => {
    req.headers.userid = '1';
    req.query = { roleId: role.id.toString() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          permissions: expect.arrayContaining([expect.any(String)]),
        }),
      })
    );
  });

  it('should update role successfully', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';
    req.query = { roleId: role.id.toString() };
    req.body = {
      name: 'John Doe',
      email: 'john@example.com',
      startDate: 1234567890,
      permissions: ['auditing_viewer', 'accounting_editor', 'internalControl_editor'],
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          permissions: expect.arrayContaining([expect.any(String)]),
        }),
      })
    );
  });

  it('should delete role successfully', async () => {
    req.method = 'DELETE';
    req.headers.userid = '1';
    req.query = { roleId: role.id.toString() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });

  it('should return error for INVALID_INPUT_PARAMETER', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';
    req.query = { roleId: role.id.toString() };
    req.body = {
      name: 'John Doe',
      email: 'john@example.com',
      startDate: 1234567890,
      auditing: 'viewer',
      accounting: 'editor',
    };
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

  it('should return error for RESOURCE_NOT_FOUND', async () => {
    req.headers.userid = '1';
    req.query = { roleId: '-1' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('404'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });

  it('should return error for METHOD_NOT_ALLOWED', async () => {
    req.headers.userid = '1';
    req.method = 'POST';
    req.query = { roleId: '1' };
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
