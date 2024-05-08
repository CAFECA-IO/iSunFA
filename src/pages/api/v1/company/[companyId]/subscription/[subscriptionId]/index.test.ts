import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
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
});

describe('test subscription API by id', () => {
  it('should get subscription by id', async () => {
    req.method = 'GET';
    req.headers.userId = '1';
    req.query.id = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(String),
          companyId: expect.any(String),
          companyName: expect.any(String),
          plan: expect.any(String),
          paymentId: expect.any(String),
          price: expect.any(String),
          autoRenew: expect.any(Boolean),
          expireDate: expect.any(Number),
          status: expect.any(String),
        }),
      })
    );
  });

  it('should update subscription', async () => {
    req.method = 'PUT';
    req.headers.userId = '1';
    req.query.id = '1';
    req.body = {
      plan: 'basic',
      paymentId: '2',
      autoRenew: false,
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
          id: expect.any(String),
          companyId: expect.any(String),
          companyName: expect.any(String),
          plan: expect.any(String),
          paymentId: expect.any(String),
          price: expect.any(String),
          autoRenew: expect.any(Boolean),
          expireDate: expect.any(Number),
          status: expect.any(String),
        }),
      })
    );
  });

  it('should delete subscription', async () => {
    req.method = 'DELETE';
    req.headers.userId = '1';
    req.query.id = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(String),
          companyId: expect.any(String),
          companyName: expect.any(String),
          plan: expect.any(String),
          paymentId: expect.any(String),
          price: expect.any(String),
          autoRenew: expect.any(Boolean),
          expireDate: expect.any(Number),
          status: expect.any(String),
        }),
      })
    );
  });

  it('should handle INVALID_INPUT_PARAMETER', async () => {
    req.method = 'GET';
    req.headers.userId = 'user-id';
    req.query.id = '';
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

  it('should handle RESOURCE_NOT_FOUND', async () => {
    req.method = 'GET';
    req.headers.userId = 'user-id';
    req.query.id = '2';
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

  it('should handle unsupported HTTP methods', async () => {
    req.method = 'POST';
    req.headers.userId = 'user-id';
    req.query.id = '1';
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
});
