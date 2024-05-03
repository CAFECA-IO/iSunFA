import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import handler from './authority';

let req: NextApiRequest;
let res: NextApiResponse;

beforeEach(() => {
  req = {
    method: '',
    headers: {},
    body: {},
  } as NextApiRequest;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as NextApiResponse;
});

afterEach(() => {
  jest.clearAllMocks();
});
describe('authority API', () => {
  it('should create Authority KYC', async () => {
    req.headers.userId = 'user123';
    req.method = 'POST';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'create Authority KYC',
      payload: { status: 'Authority KYC is under review' },
    });
  });

  it('should return error for missing userId', async () => {
    req.method = 'POST';
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

  it('should return error for invalid method', async () => {
    req.method = 'GET';
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
