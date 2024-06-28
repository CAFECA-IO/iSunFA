import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/[companyId]/card/index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(async () => {
  req = {
    body: {},
    method: 'POST',
    json: jest.fn(),
    session: { companyId: 5, userId: 1 },
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(async () => {
  jest.clearAllMocks();
});

describe('CARD API Handler Tests', () => {
  it('should handle LIST requests successfully', async () => {
    req.method = 'GET';
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
          companyId: expect.any(Number),
        }),
      ]),
    });
  });

  it('should handle POST requests successfully', async () => {
    req = {
      body: {
        type: 'VISA',
        no: '1234-1234-1234-1234',
        expireYear: '29',
        expireMonth: '01',
        cvc: '330',
        name: 'Taiwan Bank',
      },
      method: 'POST',
      json: jest.fn(),
      session: { companyId: 4, userId: 1 },
    } as unknown as jest.Mocked<NextApiRequest>;

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
          type: expect.any(String),
          no: expect.any(String),
          expireYear: expect.any(String),
          expireMonth: expect.any(String),
          cvc: expect.any(String),
          name: expect.any(String),
          companyId: expect.any(Number),
        }),
      })
    );
  });

  it('should handle INVALID_INPUT_PARAMETERs for POST requests', async () => {
    req.method = 'POST';
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
