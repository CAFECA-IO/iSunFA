import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    query: {},
    method: '',
    json: jest.fn(),
    body: {},
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('updateOwnAccountInfoById API Handler Tests', () => {
  it('should update the information of owned account successfully', async () => {
    req.method = 'PUT';
    req.query = { id: '1' };
    req.body = {
      type: 'asset',
      liquidity: 'non-current',
      account: 'cash',
      code: '1103-2',
      name: 'Sun Bank',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'update successful',
      payload: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          type: expect.any(String),
          liquidity: expect.any(String),
          account: expect.any(String),
          code: expect.any(String),
          name: expect.any(String),
        }),
      ]),
    });
  });

  it('should return 400 if some body element is missing', async () => {
    req.method = 'PUT';
    req.query = { id: '1' };
    req.body = {
      type: 'asset',
      liquidity: 'non-current',
      code: '1103-2',
      name: 'Sun Bank',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'update failed',
      payload: null,
    });
  });
});

describe('deleteOwnAccountById API Handler Tests', () => {
  it('should successfully delete an owned account', async () => {
    req.method = 'DELETE';
    req.query = { id: '1' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'delete successful',
      payload: null,
    });
  });

  it('should return 400 if id is not provided', async () => {
    req.method = 'DELETE';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'delete failed',
      payload: null,
    });
  });
});
