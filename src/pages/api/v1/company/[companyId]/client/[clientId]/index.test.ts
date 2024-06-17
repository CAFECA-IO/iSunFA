import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import { ROLE_NAME } from '@/constants/role_name';
import { IAdmin } from '@/interfaces/admin';
import { formatAdmin } from '@/lib/utils/formatter/admin.formatter';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let admin: IAdmin;
let clientId: number;
let companyId: number;

beforeEach(async () => {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const createdAdmin = await prisma.admin.create({
    data: {
      user: {
        connectOrCreate: {
          where: {
            credentialId: 'client_index2_test',
          },
          create: {
            name: 'John',
            credentialId: 'client_index2_test',
            publicKey: 'publicKey',
            algorithm: 'ES256',
            imageId: 'imageId',
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      role: {
        connectOrCreate: {
          where: {
            name: ROLE_NAME.OWNER,
          },
          create: {
            name: ROLE_NAME.OWNER,
            permissions: ['hihi', 'ooo'],
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      company: {
        connectOrCreate: {
          where: {
            code: 'TST_client_11',
          },
          create: {
            code: 'TST_client_11',
            name: 'Test Company',
            regional: 'TW',
            kycStatus: false,
            imageId: 'imageId',
            startDate: nowTimestamp,
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      email: 'client_index2_test@test',
      status: true,
      startDate: nowTimestamp,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  });
  admin = await formatAdmin(createdAdmin);
  const createdClient = await prisma.client.create({
    data: {
      company: {
        connect: {
          id: admin.company.id,
        },
      },
      name: 'Test Client',
      taxId: '12345678',
      favorite: false,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });
  clientId = createdClient.id;

  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    session: { userId: admin.user.id, companyId: admin.company.id },
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
    await prisma.admin.delete({
      where: {
        id: admin.id,
      },
    });
  } catch (error) {
    /* empty */
  }
  try {
    await prisma.client.delete({
      where: {
        id: clientId,
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

describe('Client API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    req.method = 'GET';
    req.query.clientId = clientId.toString();
    await handler(req, res);
    const expectedClient = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      name: expect.any(String),
      taxId: expect.any(String),
      favorite: expect.any(Boolean),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedClient,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should handle PUT requests successfully', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';
    req.query.clientId = clientId.toString();
    req.body = {
      name: 'New client Name ',
      taxId: 'sss33',
    };
    await handler(req, res);
    const expectedClient = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      name: expect.any(String),
      taxId: expect.any(String),
      favorite: expect.any(Boolean),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedClient,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should handle DELETE requests successfully', async () => {
    req.method = 'DELETE';
    req.headers.userid = '1';
    req.query.clientId = clientId.toString();
    await handler(req, res);
    const expectedClient = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      name: expect.any(String),
      taxId: expect.any(String),
      favorite: expect.any(Boolean),
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedClient,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should handle requests without userid session', async () => {
    req = {
      headers: {},
      body: null,
      query: {},
      method: 'GET',
      session: {},
      json: jest.fn(),
    } as unknown as jest.Mocked<NextApiRequest>;
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

  it('should handle requests with INVALID_INPUT_PARAMETER', async () => {
    req.method = 'GET';
    req.headers.userid = '1';
    req.query.clientId = '';
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

  it('should handle requests with unsupported methods', async () => {
    req.method = 'POST';
    req.headers.userid = '1';
    req.query.clientId = '1';
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
