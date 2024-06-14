import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/[companyId]/admin/[adminId]/index';
import prisma from '@/client';
import { IAdmin } from '@/interfaces/admin';
import { ROLE_NAME } from '@/constants/role_name';

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
            name: ROLE_NAME.SUPER_ADMIN,
          },
          create: {
            name: ROLE_NAME.SUPER_ADMIN,
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
      name: ROLE_NAME.SUPER_ADMIN,
    },
  });
  if (!role) {
    await prisma.role.create({
      data: {
        name: ROLE_NAME.SUPER_ADMIN,
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
      roleName: ROLE_NAME.SUPER_ADMIN,
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
      roleName: ROLE_NAME.VIEWER,
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

  it('should return error when userId is not in session', async () => {
    req = {
      headers: {},
      query: {},
      method: '',
      json: jest.fn(),
      body: {},
      session: {},
    } as unknown as jest.Mocked<NextApiRequest>;
    req.method = 'GET';
    req.query = { adminId: admin.id.toString() };
    await handler(req, res);

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('401'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should return error when companyId is null', async () => {
    req = {
      headers: {},
      query: {},
      method: '',
      json: jest.fn(),
      body: {},
      session: { userId: admin.user.id },
    } as unknown as jest.Mocked<NextApiRequest>;
    req.method = 'GET';
    req.query = { adminId: admin.id.toString() };
    await handler(req, res);

    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('403'),
      message: expect.any(String),
      payload: expect.any(Object),
    });

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });
});
