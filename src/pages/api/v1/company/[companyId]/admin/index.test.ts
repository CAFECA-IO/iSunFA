import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';
import version from '../../../../../../lib/version';

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

describe('test admin API handler', () => {
  it('should list all admins', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.arrayContaining([
          expect.objectContaining({
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
        ]),
      })
    );
  });

  it('should create admin successfully', async () => {
    req.method = 'POST';
    req.body = {
      name: 'John Doe',
      email: 'john@example.com',
    };
    await handler(req, res);
    const admin = {
      id: '3',
      companyId: '1',
      companyName: 'mermer',
      name: 'John Doe',
      credentialId: '3',
      publicKey: '3',
      algorithm: 'ES256',
      email: 'john@example.com',
      startDate: 124124124,
      endDate: 123123123,
      permissions: ['auditing_editor', 'accounting_editor', 'internalControl_editor'],
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

  it('should return error for missing input parameters', async () => {
    req.method = 'POST';
    req.body = {
      name: 'John Doe',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '422',
      payload: {},
      message: 'INVALID_INPUT_PARAMETER',
    });
  });

  it('should return error for METHOD_NOT_ALLOWED', async () => {
    req.method = 'PUT';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '405',
      payload: {},
      message: 'METHOD_NOT_ALLOWED',
    });
  });
});
