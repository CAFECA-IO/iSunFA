import { NextApiRequest, NextApiResponse } from 'next';
import { IRole } from '@/interfaces/role';
import prisma from '@/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let role: IRole;
let companyId: number;

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

  const createdRole = await prisma.role.create({
    data: {
      company: {
        create: {
          name: 'Test Company',
          code: 'TST',
          regional: 'TW',
        },
      },
      name: 'KING',
      permissions: ['READ', 'WRITE'],
    },
    include: {
      company: {
        select: {
          name: true,
        },
      },
    },
  });
  companyId = createdRole.companyId;
  role = {
    ...createdRole,
    companyName: createdRole.company.name,
  };
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
  try {
    await prisma.company.delete({
      where: {
        id: companyId,
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
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            companyId: expect.any(Number),
            companyName: expect.any(String),
            permissions: expect.arrayContaining([expect.any(String)]),
          }),
        ]),
      })
    );
  });

  it('should create role successfully', async () => {
    req.method = 'POST';
    req.body = {
      name: 'queen',
    };
    req.query = {
      companyId: companyId.toString(),
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('201'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          companyId: expect.any(Number),
          companyName: expect.any(String),
          permissions: expect.arrayContaining([expect.any(String)]),
        }),
      })
    );
  });

  it('should return error for missing input parameters', async () => {
    req.method = 'POST';
    req.body = {
      // name: 'John Doe',
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

  it('should return error for METHOD_NOT_ALLOWED', async () => {
    req.method = 'PUT';
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
