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
    method: 'GET',
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('getPublicAccounts API Handler Tests', () => {
  it('should handle GET request successfully', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const expectedPayload = expect.arrayContaining([
      expect.objectContaining({
        code: expect.any(Number),
        account: expect.any(String),
      }),
    ]);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'request successful',
      payload: expectedPayload,
    });
  });
  it('should return successfully if any params provided', async () => {
    req.method = 'GET';
    req.query = { code: '1103', account: '銀行存款' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const expectedPayload = expect.arrayContaining([
      expect.objectContaining({
        code: parseInt(req.query.code as string, 10),
        account: req.query.account as string,
      }),
    ]);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'request successful',
      payload: expectedPayload,
    });
  });
});
