import { NextApiRequest, NextApiResponse } from 'next';
import { ICard } from '@/interfaces/card';
import prisma from '@/../prisma/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let card: ICard;

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
  card = await prisma.card.create({
    data: {
      type: 'VISA',
      no: '1234-1234-1234-1234',
      expireYear: '29',
      expireMonth: '01',
      cvc: '330',
      name: 'Taiwan Bank',
    },
  });
});

afterEach(async () => {
  jest.clearAllMocks();
  const afterCard = await prisma.card.findUnique({
    where: {
      id: card.id,
    },
  });
  if (afterCard) {
    await prisma.card.delete({
      where: {
        id: card.id,
      },
    });
  }
});

describe('Payment API Handler Tests', () => {
  it('should handle LIST requests successfully', async () => {
    req.method = 'GET';
    req.headers.userid = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          type: expect.any(String),
          no: expect.any(String),
          expireYear: expect.any(String),
          expireMonth: expect.any(String),
          cvc: expect.any(String),
          name: expect.any(String),
        }),
      ]),
    });
  });

  it('should handle POST requests successfully', async () => {
    req.method = 'POST';
    req.headers.userid = '1';
    req.body = {
      type: 'VISA',
      no: '1234-1234-1234-1234',
      expireYear: '29',
      expireMonth: '01',
      cvc: '330',
      name: 'Taiwan Bank',
    };
    await handler(req, res);
    await prisma.card.delete({
      where: {
        id: res.json.mock.calls[0][0].payload.id,
      },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('201'),
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

  it('should handle INVALID_INPUT_PARAMETERs for POST requests', async () => {
    req.method = 'POST';
    req.headers.userid = '1';
    req.body = {
      type: 'VISA',
      no: '1234-1234-1234-1234',
      expireYear: '29',
      expireMonth: '01',
      cvc: '330',
      // Missing name parameter
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

  it('should handle unsupported HTTP methods', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';
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

  it('should handle missing userid in headers', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('404'),
        payload: expect.any(Object),
        message: expect.any(String),
      })
    );
  });
});
