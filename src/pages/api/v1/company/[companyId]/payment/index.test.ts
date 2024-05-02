import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';
import version from '../../../../../../lib/version';

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

describe('test payment API', () => {
  it('should list all payments', async () => {
    req.headers.userId = '1';
    await handler(req, res);
    const paymentList = [
      {
        id: '1',
        type: 'VISA',
        no: '1234-1234-1234-1234',
        expireYear: '29',
        expireMonth: '01',
        cvc: '330',
        name: 'Taiwan Bank',
      },
      {
        id: '2',
        type: 'VISA',
        no: '5678-5678-5678-5678',
        expireYear: '29',
        expireMonth: '01',
        cvc: '355',
        name: 'Taishin International Bank',
      },
    ];
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'list all payments',
      payload: paymentList,
    });
  });

  it('should create payment', async () => {
    req.method = 'POST';
    req.headers.userId = '1';
    req.body = {
      type: 'VISA',
      no: '1234-5678-9012-3456',
      expireYear: '30',
      expireMonth: '12',
      cvc: '123',
      name: 'Test Bank',
    };
    await handler(req, res);
    const newPayment = {
      id: '3',
      type: 'VISA',
      no: '1234-5678-9012-3456',
      expireYear: '30',
      expireMonth: '12',
      cvc: '123',
      name: 'Test Bank',
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'create payment',
      payload: newPayment,
    });
  });

  it('should return error for invalid method', async () => {
    req.method = 'PUT';
    req.headers.userId = '1';
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

  it('should return error for missing userId', async () => {
    req.headers.userId = undefined;
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
  it('should return error for missing input parameter', async () => {
    req.method = 'POST';
    req.headers.userId = '1';
    req.body = {
      type: 'VISA',
      no: '1234-5678-9012-3456',
      expireYear: '30',
      expireMonth: '12',
      cvc: '123',
      // name: 'Test Bank',
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
});
