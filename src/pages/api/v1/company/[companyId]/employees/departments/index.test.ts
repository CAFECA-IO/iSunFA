import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    query: {},
    method: 'GET',
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

describe('getAllDepartments API Handler Tests', () => {
  it('should return all departments information', async () => {
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'request successful',
      payload: expect.arrayContaining([expect.any(String)]),
    });
  });
  it('should return 400 if method is not GET', async () => {
    req.method = 'POST';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'bad request',
      payload: null,
    });
  });
});
