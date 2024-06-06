import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/[companyId]/admin/[adminId]/index';
import prisma from '@/client';
import { ROLE } from '@/constants/role';
import { IAdmin } from '@/interfaces/admin';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let admin: IAdmin;

beforeEach(async () => {
  admin = await prisma.admin.create({
    data: {
      user: {
        connectOrCreate: {
          where: {
            credentialId: 'admin_test2',
          },
          create: {
            name: 'John admin',
            credentialId: 'admin_test2',
            publicKey: 'publicKey',
            algorithm: 'ES256',
            imageId: 'imageId',
            createdAt: 0,
            updatedAt: 0,
          },
        },
      },
      company: {
        connectOrCreate: {
          where: {
            code: 'admin_test2',
          },
          create: {
            code: 'admin_test2',
            name: 'Test Company',
            regional: 'TW',
            kycStatus: false,
            imageId: 'imageId',
            startDate: 0,
            createdAt: 0,
            updatedAt: 0,
          },
        },
      },
      role: {
        connectOrCreate: {
          where: {
            name: ROLE.OWNER,
          },
          create: {
            name: ROLE.OWNER,
            permissions: ['hihi'],
            createdAt: 0,
            updatedAt: 0,
          },
        },
      },
      email: 'admin_test2@test',
      status: true,
      startDate: 0,
      createdAt: 0,
      updatedAt: 0,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  });
  const role = await prisma.role.findUnique({
    where: {
      name: 'test_admin',
    },
  });
  if (!role) {
    await prisma.role.create({
      data: {
        name: 'test_admin',
        permissions: ['hihi'],
        createdAt: 0,
        updatedAt: 0,
      },
    });
  }
  req = {
    headers: {},
    query: {},
    method: '',
    json: jest.fn(),
    body: {},
    session: { userId: admin.user.id, companyId: admin.company.id },
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await prisma.admin.delete({
      where: {
        id: admin.id,
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.company.delete({
      where: {
        id: admin.company.id,
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.user.delete({
      where: {
        id: admin.user.id,
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.role.delete({
      where: {
        id: admin.role.id,
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.role.delete({
      where: {
        name: 'test_admin',
      },
    });
  } catch (error) {
    /* empty */
  }
});

describe('API Handler Tests', () => {
  it('should return admin when GET method is used and admin exists', async () => {
    req.method = 'GET';
    req.query = { adminId: admin.id.toString() };
    await handler(req, res);
    const expectedAdmin = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      userId: expect.any(Number),
      roleId: expect.any(Number),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
      user: expect.any(Object),
      company: expect.any(Object),
      role: expect.any(Object),
    });

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedAdmin,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should update admin when PUT method is used and valid data is provided', async () => {
    req.method = 'PUT';
    req.body = {
      status: false,
      roleName: 'test_admin',
    };
    req.query = { adminId: admin.id.toString() };
    await handler(req, res);
    const expectedAdmin = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      userId: expect.any(Number),
      roleId: expect.any(Number),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
      user: expect.any(Object),
      company: expect.any(Object),
      role: expect.any(Object),
    });

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedAdmin,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should delete admin when DELETE method is used and admin exists', async () => {
    req.method = 'DELETE';
    req.query = { adminId: admin.id.toString() };
    await handler(req, res);
    const expectedAdmin = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      userId: expect.any(Number),
      roleId: expect.any(Number),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
      user: expect.any(Object),
      company: expect.any(Object),
      role: expect.any(Object),
    });

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedAdmin,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should return error when an unsupported method is used', async () => {
    req.method = 'POST';
    req.query = { adminId: '1' };
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

    // Add your assertions here
  });
  it('should return error when PUT method is used and admin does not exist', async () => {
    req.method = 'PUT';
    req.query = { adminId: '-1' };
    req.body = {
      status: false,
      roleName: ROLE.VIEWER,
    };
    await handler(req, res);

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('404'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });
});
