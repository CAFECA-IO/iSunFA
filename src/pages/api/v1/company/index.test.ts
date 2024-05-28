import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/index';
import { ICompany } from '@/interfaces/company';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let company: ICompany;

beforeEach(async () => {
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    session: { userId: 1 },
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;

  const getCompany = await prisma.company.findFirst({
    where: {
      code: 'TST',
    },
  });
  if (!getCompany) {
    const now = Date.now();
    const currentTimestamp = timestampInSeconds(now);
    await prisma.company.create({
      data: {
        code: 'TST',
        name: 'Test Company',
        regional: 'TW',
        startDate: currentTimestamp,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      },
    });
  }
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await prisma.company.delete({
      where: {
        id: company.id,
      },
    });
  } catch (error) {
    // Info: (20240515 - Jacky) If already deleted, ignore the error.
  }
});

describe('Company API', () => {
  it('should return a list of companies when method is GET', async () => {
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
            code: expect.any(String),
            name: expect.any(String),
            regional: expect.any(String),
          }),
        ]),
      })
    );
  });

  it('should create a new company when method is POST and valid data is provided', async () => {
    req.method = 'POST';
    req.headers.userid = '1';
    req.body = {
      code: 'TSTTST',
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
        payload: expect.objectContaining({
          id: expect.any(Number),
          code: expect.any(String),
          name: expect.any(String),
          regional: expect.any(String),
        }),
      })
    );
    await prisma.company.delete({
      where: {
        id: res.json.mock.calls[0][0].payload.id,
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
