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

describe('Admin API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    req.method = 'GET';
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
          companyId: '1',
          companyName: 'mermer',
          userId: '1',
          userName: 'bob',
          email: 'bob@mermer.cc',
          startDate: 21321321,
          auditing: 'viewer',
          accounting: 'editor',
          internalControl: 'editor',
        },
        {
          id: '2',
          companyId: '1',
          companyName: 'mermer',
          userId: '2',
          userName: 'alice',
          email: 'alice@mermer.cc',
          startDate: 134214124,
          auditing: 'viewer',
          accounting: 'editor',
          internalControl: 'editor',
        },
      ],
    });
  });

  it('should handle POST requests successfully', async () => {
    req.method = 'POST';
    req.headers.userId = '1';
    req.body = {
      name: 'New Admin',
      email: 'newadmin@mermer.cc',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'Create admin successfully',
      payload: {
        id: '3',
        companyId: '1',
        companyName: 'mermer',
        userId: '3',
        userName: 'New Admin',
        email: 'newadmin@mermer.cc',
        startDate: 124124124,
        auditing: 'editor',
        accounting: 'editor',
        internalControl: 'editor',
      },
    });
  });

  it('should handle requests without userId header', async () => {
    req.method = 'GET';
    delete req.headers.userId;
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

  it('should handle requests with unsupported methods', async () => {
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
});
