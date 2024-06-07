import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { IClient } from '@/interfaces/client';
import { timestampInSeconds } from '@/lib/utils/common';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let client: IClient;
let companyId: number;

beforeEach(async () => {
  req = {
    headers: {},
    body: null,
    query: {},
    method: '',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;

  let company = await prisma.company.findFirst({
    where: {
      code: 'TST_client1',
    },
  });
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  if (!company) {
    company = await prisma.company.create({
      data: {
        code: 'TST_client1',
        name: 'Test Company',
        regional: 'TW',
        kycStatus: false,
        startDate: nowTimestamp,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });
  }

  const createdClient = await prisma.client.create({
    data: {
      company: {
        connect: {
          id: company.id,
        },
      },
      favorite: false,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    include: {
      company: {
        select: {
          name: true,
          code: true,
        },
      },
    },
  });
  companyId = createdClient.companyId;
  client = {
    ...createdClient,
    companyId: createdClient.companyId,
    companyName: createdClient.company.name,
    code: createdClient.company.code,
  };
  return client;
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await prisma.client.delete({
      where: {
        id: client.id,
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
    req.headers.userid = '1';
    req.query.clientId = client.id.toString();
    await handler(req, res);
    const expectedClient = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      companyName: expect.any(String),
      code: expect.any(String),
      favorite: expect.any(Boolean),
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
    req.query.clientId = client.id.toString();
    req.body = {
      name: 'New Company Name',
      code: '5678',
    };
    await handler(req, res);
    const expectedClient = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      companyName: expect.any(String),
      code: expect.any(String),
      favorite: expect.any(Boolean),
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
    req.query.clientId = client.id.toString();
    await handler(req, res);
    const expectedClient = expect.objectContaining({
      id: expect.any(Number),
      companyId: expect.any(Number),
      companyName: expect.any(String),
      code: expect.any(String),
      favorite: expect.any(Boolean),
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

  it('should handle requests without userid header', async () => {
    req.method = 'GET';
    delete req.headers.userid;
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
