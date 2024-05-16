import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/index';
import { ICompany } from '@/interfaces/company';
import prisma from '@/client';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let company: ICompany;

beforeEach(async () => {
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;

  company = await prisma.company.create({
    data: {
      code: 'COMP123',
      name: 'Company Name',
      regional: 'Regional Name',
    },
  });
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
      code: 'COMP123',
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

  it('should return an error when user ID is not provided', async () => {
    req.headers = {};

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
});
