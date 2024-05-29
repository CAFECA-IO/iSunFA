import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/index';
import prisma from '@/client';

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
            credentialId: 'company_index_test',
          },
          create: {
            name: 'John',
            credentialId: 'company_index_test',
            publicKey: 'publicKey',
            algorithm: 'ES256',
            imageId: 'imageId',
          },
        },
      },
      role: {
        connectOrCreate: {
          where: {
            name: 'COMPANY_ADMIN',
          },
          create: {
            name: 'COMPANY_ADMIN',
            permissions: ['hihi', 'ooo'],
          },
        },
      },
      company: {
        connectOrCreate: {
          where: {
            code: 'TST_company_user1',
          },
          create: {
            code: 'TST_company_user1',
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

describe('Company API', () => {
  it('should return a list of companies when method is GET', async () => {
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
            company: expect.objectContaining({
              id: expect.any(Number),
              code: expect.any(String),
              name: expect.any(String),
              regional: expect.any(String),
            }),
            role: expect.objectContaining({
              id: expect.any(Number),
              name: expect.any(String),
              permissions: expect.any(Array),
            }),
          }),
        ]),
      })
    );
  });

  it('should create a new company when method is POST and valid data is provided', async () => {
    req.method = 'POST';
    req.body = {
      code: 'TST_createCompany1',
      name: 'Company Name',
      regional: 'Regional Name',
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('201'),
        message: expect.any(String),
        payload: {
          company: expect.objectContaining({
            id: expect.any(Number),
            code: expect.any(String),
            name: expect.any(String),
            regional: expect.any(String),
          }),
          role: expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            permissions: expect.any(Array),
          }),
        },
      })
    );
    await prisma.userCompanyRole.delete({
      where: {
        userId_companyId_roleId: {
          userId: userCompanyRole.userId,
          companyId: res.json.mock.calls[0][0].payload.company.id,
          roleId: res.json.mock.calls[0][0].payload.role.id,
        },
      },
    });
    await prisma.company.delete({
      where: {
        code: 'TST_createCompany1',
      },
    });
  });

  it('should return an error when method is POST and invalid data is provided', async () => {
    req.method = 'POST';
    req.headers.userid = '1';
    req.body = {
      // missing required fields
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

  it('should return an error when method is not allowed', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';

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

  it('should return an error when session is UNAUTHORIZED', async () => {
    req = {
      headers: {},
      body: null,
      query: {},
      method: 'GET',
      session: {},
      json: jest.fn(),
    } as unknown as jest.Mocked<NextApiRequest>;

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('401'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });
});
