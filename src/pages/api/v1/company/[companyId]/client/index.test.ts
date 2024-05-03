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

describe('Client API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    req.method = 'GET';
    req.headers.userId = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'list all clients',
      payload: [
        {
          id: '1',
          companyId: '123',
          companyName: 'Company A',
          code: '1234',
          favorite: false,
        },
        {
          id: '2',
          companyId: '456',
          companyName: 'Company B',
          code: '3333',
          favorite: false,
        },
      ],
    });
  });

  it('should handle POST requests successfully', async () => {
    req.method = 'POST';
    req.headers.userId = '1';
    req.body = {
      name: 'New Client',
      code: '5678',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'create client',
      payload: {
        id: '3',
        name: 'New Client',
        code: '5678',
        favorite: false,
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
