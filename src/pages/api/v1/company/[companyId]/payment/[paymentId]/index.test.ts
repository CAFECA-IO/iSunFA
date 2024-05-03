import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
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
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Payment API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    req.method = 'GET';
    req.headers.userId = '1';
    req.query.id = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'list payment by id',
      payload: {
        id: '1',
        type: 'VISA',
        no: '1234-1234-1234-1234',
        expireYear: '29',
        expireMonth: '01',
        cvc: '330',
        name: 'Taiwan Bank',
      },
    });
  });

  it('should handle PUT requests successfully', async () => {
    req.method = 'PUT';
    req.headers.userId = '1';
    req.query.id = '1';
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
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'update payment by id',
      payload: {
        id: '3',
        type: 'MASTERCARD',
        no: '5678-5678-5678-5678',
        expireYear: '30',
        expireMonth: '12',
        cvc: '123',
        name: 'US Bank',
      },
    });
  });

  it('should handle DELETE requests successfully', async () => {
    req.method = 'DELETE';
    req.headers.userId = '1';
    req.query.id = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'delete payment 1 successfully',
      payload: {
        id: '1',
        type: 'VISA',
        no: '1234-1234-1234-5678',
        expireYear: '29',
        expireMonth: '01',
        cvc: '330',
        name: 'Taiwan Bank',
      },
    });
  });

  it('should handle missing userId in headers for GET requests', async () => {
    req.method = 'GET';
    req.query.id = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '404',
      payload: {},
      message: 'Resource not found',
    });
  });

  it('should handle missing id in query for GET requests', async () => {
    req.method = 'GET';
    req.headers.userId = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '422',
      payload: {},
      message: 'Invalid input parameter',
    });
  });

  it('should handle missing userId in headers for PUT requests', async () => {
    req.method = 'PUT';
    req.query.id = '3';
    req.body = {
      type: 'MASTERCARD',
      no: '5678-5678-5678-5678',
      expireYear: '30',
      expireMonth: '12',
      cvc: '123',
      name: 'US Bank',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '404',
      payload: {},
      message: 'Resource not found',
    });
  });

  it('should handle missing id in query for PUT requests', async () => {
    req.method = 'PUT';
    req.headers.userId = '1';
    req.body = {
      type: 'MASTERCARD',
      no: '5678-5678-5678-5678',
      expireYear: '30',
      expireMonth: '12',
      cvc: '123',
      name: 'US Bank',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '422',
      payload: {},
      message: 'Invalid input parameter',
    });
  });

  it('should handle missing userId in headers for DELETE requests', async () => {
    req.method = 'DELETE';
    req.query.id = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '404',
      payload: {},
      message: 'Resource not found',
    });
  });

  it('should handle unsupported HTTP methods', async () => {
    req.method = 'POST';
    req.headers.userId = '1';
    req.query.id = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '405',
      payload: {},
      message: 'Method Not Allowed',
    });
  });
});
