import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';
import version from '../../../../lib/version';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    body: null,
    query: { id: '1' },
    method: 'GET',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

describe('test post admin API', () => {
  it('should list admin', async () => {
    req.headers.userId = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'list all admins',
      payload: [
        {
          id: '1',
          name: 'bob',
          email: 'bob@mermer.cc',
          startDate: '2021-01-01',
          auditing: 'viewer',
          accounting: 'editor',
          internalControl: 'editor',
        },
        {
          id: '2',
          name: 'alice',
          email: 'alice@mermer.cc',
          startDate: '2021-01-01',
          auditing: 'viewer',
          accounting: 'editor',
          internalControl: 'editor',
        },
      ],
    });
  });

  it('should create admin', async () => {
    req.method = 'POST';
    req.body = { name: 'kkk', email: 'kkk@mermer.cc' };
    await handler(req, res);
    const admin = {
      id: '3',
      name: 'kkk',
      email: 'kkk@mermer.cc',
      startDate: '2021-01-01',
      auditing: 'editor',
      accounting: 'editor',
      internalControl: 'editor',
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'Create admin successfully',
      payload: admin,
    });
  });

  it('should return error for invalid input parameter', async () => {
    req.method = 'POST';
    req.body = { name: '', email: 'kkk@mermer.cc' };
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

  it('should return error for invalid method', async () => {
    req.method = 'PUT';
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

  it('should return error for unauthorized user', async () => {
    req.headers.userId = '2';
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
