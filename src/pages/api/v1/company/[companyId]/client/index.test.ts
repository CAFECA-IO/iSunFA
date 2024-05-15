import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { IClient } from '@/interfaces/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let client: IClient;

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

  const createdClient = await prisma.client.create({
    data: {
      company: {
        connectOrCreate: {
          where: {
            id: 1,
          },
          create: {
            name: 'Test Company',
            code: 'TST',
            regional: 'TW',
          },
        },
      },
      favorite: false,
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
});

describe('Client API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    req.method = 'GET';
    req.headers.userid = '1';
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
            companyId: expect.any(Number),
            companyName: expect.any(String),
            code: expect.any(String),
            favorite: expect.any(Boolean),
          }),
        ]),
      })
    );
  });

  it('should handle POST requests successfully', async () => {
    req.method = 'POST';
    req.headers.userid = '1';
    req.body = {
      companyId: 1,
      favorite: false,
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
          companyId: expect.any(Number),
          companyName: expect.any(String),
          code: expect.any(String),
          favorite: expect.any(Boolean),
        }),
      })
    );
  });

  it('should handle requests without userid header', async () => {
    req.method = 'GET';
    delete req.headers.userid;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('404'),
        payload: {},
        message: expect.stringContaining('Resource not found'),
      })
    );
  });

  it('should handle requests with unsupported methods', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('405'),
        payload: {},
        message: expect.stringContaining('Method not allowed'),
      })
    );
  });
});
