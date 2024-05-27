import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { ICompany } from '@/interfaces/company';
import { timestampInSeconds } from '@/lib/utils/common';
import handler from './index';

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
      startDate: timestampInSeconds(Date.now()),
      createdAt: timestampInSeconds(Date.now()),
      updatedAt: timestampInSeconds(Date.now()),
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

describe('handler', () => {
  it('should handle GET method', async () => {
    req.method = 'GET';
    req.headers = { userid: '123' };
    req.query = { companyId: company.id.toString() };

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
    req.headers = { userid: '123' };
    req.query = { companyId: company.id.toString() };
    req.body = { code: 'C001', name: 'Company B', regional: 'US' };

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
    req.query = { companyId: company.id.toString() };

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
    req.query = { companyId: company.id.toString() };

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
    req.query = { companyId: company.id.toString() };
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
