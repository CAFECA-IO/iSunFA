import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import handler from './index';

let req: NextApiRequest;
let res: NextApiResponse;

beforeEach(() => {
  req = {
    method: '',
    headers: {},
    body: {},
    query: {},
  } as NextApiRequest;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as NextApiResponse;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Payment API handler', () => {
  it('should return a payment by id when method is GET', async () => {
    req.method = 'GET';
    req.headers.userId = 'user123';
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

  it('should update a payment by id when method is PUT', async () => {
    req.method = 'PUT';
    req.headers.userId = 'user123';
    req.query.id = '1';
    req.body = {
      type: 'MasterCard',
      no: '5678-5678-5678-5678',
      expireYear: '30',
      expireMonth: '12',
      cvc: '123',
      name: 'New Bank',
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
        type: 'MasterCard',
        no: '5678-5678-5678-5678',
        expireYear: '30',
        expireMonth: '12',
        cvc: '123',
        name: 'New Bank',
      },
    });
  });

  it('should delete a payment by id when method is DELETE', async () => {
    req.method = 'DELETE';
    req.headers.userId = 'user123';
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

  it('should return an error when method is not allowed', async () => {
    req.method = 'POST';
    req.headers.userId = 'user123';
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

  it('should return an error when userId is missing', async () => {
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

  it('should return an error when id is missing', async () => {
    req.method = 'GET';
    req.headers.userId = 'user123';

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
  it('should return an error when id is not found', async () => {
    req.method = 'GET';
    req.headers.userId = 'user123';
    req.query.id = '2';

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
});
