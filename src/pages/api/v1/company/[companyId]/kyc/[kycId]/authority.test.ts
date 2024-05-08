import { NextApiRequest, NextApiResponse } from 'next';
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
    req.headers.userid = 'user123';
    req.method = 'POST';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('201'),
        message: expect.any(String),
        payload: expect.any(String),
      })
    );
  });

  it('should return error for missing userid', async () => {
    req.method = 'POST';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('404'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });

  it('should return error for invalid method', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('405'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });
});
