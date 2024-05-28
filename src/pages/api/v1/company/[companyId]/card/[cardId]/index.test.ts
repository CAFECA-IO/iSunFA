import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { ICard } from '@/interfaces/card';
import { timestampInSeconds } from '@/lib/utils/common';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let card: ICard;
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
      code: 'TST_card2',
    },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        code: 'TST_card2',
        name: 'Test Company',
        regional: 'TW',
        startDate: timestampInSeconds(Date.now()),
        createdAt: timestampInSeconds(Date.now()),
        updatedAt: timestampInSeconds(Date.now()),
      },
    });
  }
  card = await prisma.card.create({
    data: {
      type: 'VISA',
      no: '1234-1234-1234-1234',
      expireYear: '29',
      expireMonth: '01',
      cvc: '330',
      name: 'Taiwan Bank',
      company: {
        connect: {
          id: company.id,
        },
      },
    },
  });
  companyId = company.id;
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await prisma.card.delete({
      where: {
        id: card.id,
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

describe('Payment API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    req.method = 'GET';
    req.headers.userid = '1';
    req.query.cardId = card.id.toString();
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
          type: expect.any(String),
          no: expect.any(String),
          expireYear: expect.any(String),
          expireMonth: expect.any(String),
          cvc: expect.any(String),
          name: expect.any(String),
        }),
      })
    );
  });

  it('should handle PUT requests successfully', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';
    req.query.cardId = card.id.toString();
    req.body = {
      type: 'MASTERCARD',
      no: '5678-5678-5678-5678',
      expireYear: '30',
      expireMonth: '12',
      cvc: '123',
      name: 'US Bank',
    };
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
          type: expect.any(String),
          no: expect.any(String),
          expireYear: expect.any(String),
          expireMonth: expect.any(String),
          cvc: expect.any(String),
          name: expect.any(String),
        }),
      })
    );
  });

  it('should handle DELETE requests successfully', async () => {
    await handler(req, res);
    req.method = 'DELETE';
    req.headers.userid = '1';
    req.query.cardId = card.id.toString();
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
          type: expect.any(String),
          no: expect.any(String),
          expireYear: expect.any(String),
          expireMonth: expect.any(String),
          cvc: expect.any(String),
          name: expect.any(String),
        }),
      })
    );
  });

  it('should handle missing userid in headers for GET requests', async () => {
    req.method = 'GET';
    req.query.cardId = card.id.toString();
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

  it('should handle missing id in query for GET requests', async () => {
    req.method = 'GET';
    req.headers.userid = card.id.toString();
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

  it('should handle unsupported HTTP methods', async () => {
    req.method = 'POST';
    req.headers.userid = '1';
    req.query.cardId = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('405'),
        payload: expect.any(Object),
        message: expect.any(String),
      })
    );
  });
});
