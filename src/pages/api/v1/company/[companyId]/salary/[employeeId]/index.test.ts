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
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(() => {
  jest.clearAllMocks();
});
describe('CreateAnSalaryBookkeeping API Handler Tests', () => {
  it('should return 400 if id is not provided', async () => {
    req.method = 'POST';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'create salary bookkeeping failed',
      payload: {},
    });
  });
  it('should create an employee salary bookkeeping', async () => {
    req.method = 'POST';
    req.query = { id: '3' };
    req.body = {
      start_date: '2023-03-01',
      end_date: '2023-03-31',
      description: 'March salary',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'create salary bookkeeping successful',
      payload: {},
    });
  });
});
