import { NextApiRequest, NextApiResponse } from 'next';
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
    req.headers.userid = '1';
    req.query.clientId = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(String),
          companyId: expect.any(String),
          companyName: expect.any(String),
          code: expect.any(String),
          favorite: expect.any(Boolean),
        }),
      })
    );
  });

  it('should handle PUT requests successfully', async () => {
    req.method = 'PUT';
    req.headers.userid = '1';
    req.query.clientId = '1';
    req.body = {
      name: 'New Company Name',
      code: '5678',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(String),
          companyId: expect.any(String),
          companyName: expect.any(String),
          code: expect.any(String),
          favorite: expect.any(Boolean),
        }),
      })
    );
  });

  it('should handle DELETE requests successfully', async () => {
    req.method = 'DELETE';
    req.headers.userid = '1';
    req.query.clientId = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(String),
          companyId: expect.any(String),
          companyName: expect.any(String),
          code: expect.any(String),
          favorite: expect.any(Boolean),
        }),
      })
    );
  });

  it('should handle requests without userid header', async () => {
    req.method = 'GET';
    delete req.headers.userid;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('404'),
        payload: expect.any(Object),
        message: expect.any(String),
      })
    );
  });

  it('should handle requests with INVALID_INPUT_PARAMETER', async () => {
    req.method = 'GET';
    req.headers.userid = '1';
    req.query.clientId = '';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('422'),
        payload: expect.any(Object),
        message: expect.any(String),
      })
    );
  });

  it('should handle requests with unsupported methods', async () => {
    req.method = 'POST';
    req.headers.userid = '1';
    req.query.clientId = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('405'),
        payload: expect.any(Object),
        message: expect.any(String),
      })
    );
  });
});
