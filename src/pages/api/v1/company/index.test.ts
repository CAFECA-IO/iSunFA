import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/index';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let companyId: number;

beforeEach(async () => {
  let user = await prisma.user.findFirst({
    where: {
      credentialId: 'companytest',
    },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'John',
        credentialId: 'companytest',
        publicKey: 'publicKey',
        algorithm: 'ES256',
        imageId: 'imageId',
      },
    });
  }
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    session: { userId: user.id },
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
  let company = await prisma.company.findFirst({
    where: {
      code: 'TST_company1',
    },
  });
  if (!company) {
    const now = Date.now();
    const currentTimestamp = timestampInSeconds(now);
    company = await prisma.company.create({
      data: {
        code: 'TST_company1',
        name: 'Test Company',
        regional: 'TW',
        startDate: currentTimestamp,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      },
    });
  }
  companyId = company.id;
});

afterEach(async () => {
  jest.clearAllMocks();
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
      code: 'TST_createCompany',
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
          id: expect.any(Number),
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
        id: res.json.mock.calls[0][0].payload.id,
      },
    });
    await prisma.company.delete({
      where: {
        code: 'TST_createCompany',
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
