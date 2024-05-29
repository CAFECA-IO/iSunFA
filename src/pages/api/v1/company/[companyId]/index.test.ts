import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let userCompanyRole: {
  userId: number;
  companyId: number;
  roleId: number;
  startDate: number;
};

beforeEach(async () => {
  userCompanyRole = await prisma.userCompanyRole.create({
    data: {
      user: {
        connectOrCreate: {
          where: {
            credentialId: 'company_index2_test',
          },
          create: {
            name: 'John',
            credentialId: 'company_index2_test',
            publicKey: 'publicKey',
            algorithm: 'ES256',
            imageId: 'imageId',
          },
        },
      },
      role: {
        connectOrCreate: {
          where: {
            name: 'COMPANY_ADMIN2',
          },
          create: {
            name: 'COMPANY_ADMIN2',
            permissions: ['hihi', 'ooo'],
          },
        },
      },
      company: {
        connectOrCreate: {
          where: {
            code: 'TST_company_11',
          },
          create: {
            code: 'TST_company_11',
            name: 'Test Company',
            regional: 'TW',
            startDate: 0,
            createdAt: 0,
            updatedAt: 0,
          },
        },
      },
      startDate: 0,
    },
  });

  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    session: { userId: userCompanyRole.userId },
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await prisma.user.delete({
      where: {
        id: userCompanyRole.userId,
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.company.delete({
      where: {
        id: userCompanyRole.companyId,
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.role.delete({
      where: {
        id: userCompanyRole.roleId,
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.userCompanyRole.delete({
      where: {
        userId_companyId_roleId: {
          userId: userCompanyRole.userId,
          companyId: userCompanyRole.companyId,
          roleId: userCompanyRole.roleId,
        },
      },
    });
  } catch (error) {
    /* empty */
  }
});

describe('handler', () => {
  it('should handle GET method', async () => {
    req.method = 'GET';
    req.headers = { userid: '123' };
    req.query = { companyId: userCompanyRole.companyId.toString() };

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
          code: expect.any(String),
          name: expect.any(String),
          regional: expect.any(String),
        }),
      })
    );
  });

  it('should handle PUT method', async () => {
    req.method = 'PUT';
    req.query = { companyId: userCompanyRole.companyId.toString() };
    req.body = { name: 'Company B', regional: 'US' };

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
          code: expect.any(String),
          name: expect.any(String),
          regional: expect.any(String),
        }),
      })
    );
  });

  it('should handle DELETE method', async () => {
    req.method = 'DELETE';
    req.headers = { userid: '123' };
    req.query = { companyId: userCompanyRole.companyId.toString() };

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
          code: expect.any(String),
          name: expect.any(String),
          regional: expect.any(String),
        }),
      })
    );
  });

  it('should handle invalid method', async () => {
    req.method = 'POST';
    req.headers = { userid: '123' };
    req.query = { companyId: userCompanyRole.companyId.toString() };

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

  it('should handle missing userid header', async () => {
    req.method = 'GET';
    req.query = { companyId: '456' };

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

  it('should handle missing companyId query parameter', async () => {
    req.method = 'GET';
    req.headers = { userid: '123' };

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

  it('should handle invalid input parameters for PUT method', async () => {
    req.method = 'PUT';
    req.headers = { userid: '123' };
    req.query = { companyId: userCompanyRole.companyId.toString() };
    req.body = {};

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
