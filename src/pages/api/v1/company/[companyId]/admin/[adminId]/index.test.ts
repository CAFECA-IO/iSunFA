import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

describe('test admin API', () => {
  it('should get admin by id', async () => {
    req.headers.userId = '1';
    req.query = { adminId: '1' };
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
          name: expect.any(String),
          credentialId: expect.any(String),
          publicKey: expect.any(String),
          algorithm: expect.any(String),
          companyId: expect.any(String),
          companyName: expect.any(String),
          email: expect.any(String),
          startDate: expect.any(Number),
          endDate: expect.any(Number),
          permissions: expect.arrayContaining([expect.any(String)]),
        }),
      })
    );
  });

  it('should update admin successfully', async () => {
    req.method = 'PUT';
    req.headers.userId = '1';
    req.query = { adminId: '1' };
    req.body = {
      name: 'John Doe',
      email: 'john@example.com',
      startDate: 1234567890,
      permissions: ['auditing_viewer', 'accounting_editor', 'internalControl_editor'],
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
          name: expect.any(String),
          credentialId: expect.any(String),
          publicKey: expect.any(String),
          algorithm: expect.any(String),
          companyId: expect.any(String),
          companyName: expect.any(String),
          email: expect.any(String),
          startDate: expect.any(Number),
          endDate: expect.any(Number),
          permissions: expect.arrayContaining([expect.any(String)]),
        }),
      })
    );
  });

  it('should delete admin successfully', async () => {
    req.method = 'DELETE';
    req.headers.userId = '1';
    req.query = { adminId: '1' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });

  it('should return error for INVALID_INPUT_PARAMETER', async () => {
    req.method = 'PUT';
    req.headers.userId = '1';
    req.query = { adminId: '1' };
    req.body = {
      name: 'John Doe',
      email: 'john@example.com',
      startDate: 1234567890,
      auditing: 'viewer',
      accounting: 'editor',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('422'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });

  it('should return error for RESOURCE_NOT_FOUND', async () => {
    req.headers.userId = '1';
    req.query = { adminId: '2' };
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

  it('should return error for METHOD_NOT_ALLOWED', async () => {
    req.headers.userId = '1';
    req.method = 'POST';
    req.query = { adminId: '1' };
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
