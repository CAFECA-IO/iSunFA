import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import { IAdmin } from '@/interfaces/admin';
import { ROLE_NAME } from '@/constants/role_name';
import { deleteClientById } from '@/lib/utils/repo/client.repo';
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
            credentialId: 'company_index2_test',
          },
          create: {
            name: 'John',
            credentialId: 'company_index2_test',
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
            code: 'TST_company_11',
          },
          create: {
            code: 'TST_company_11',
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
      email: 'company_index2_test@test',
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
  admin = {
    ...createdAdmin,
    endDate: 0,
  };
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
    const expectedClientList = expect.arrayContaining([expectedClient]);
    const expectedResponse = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expectedClientList,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedResponse);
  });

  it('should handle POST requests successfully', async () => {
    req.method = 'POST';
    req.headers.userid = '1';
    req.body = {
      name: 'Test Client me',
      taxId: '12345600',
      favorite: false,
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
      code: expect.stringContaining('201'),
      message: expect.any(String),
      payload: expectedClient,
    });
    await deleteClientById((res.json as jest.Mock).mock.calls[0][0].payload.id);
    expect(res.status).toHaveBeenCalledWith(201);
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

  it('should handle requests with unsupported methods', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';
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
