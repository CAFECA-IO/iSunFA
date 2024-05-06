import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';
import version from '../../../../../lib/version';

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

describe('test user API by userId', () => {
  it('should retrieve user by userId', async () => {
    req.headers.userId = '1';
    req.query.userId = '1';
    await handler(req, res);
    const user = {
      id: '1',
      name: 'John',
      fullName: 'John Doe',
      email: 'john@mermer.cc',
      phone: '12345678',
      kycStatus: 'verified',
      credentialId: '1',
      publicKey: 'public-key',
      algorithm: 'ES256',
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      payload: user,
      message: 'Get User sucessfully',
    });
  });

  it('should update user by userId', async () => {
    req.headers.userId = '1';
    req.query.userId = '1';
    req.method = 'PUT';
    await handler(req, res);
    const user = {
      id: '1',
      name: 'John',
      fullName: 'John Doe',
      email: 'john@mermer.cc',
      phone: '12345678',
      kycStatus: 'verified',
      credentialId: '1',
      publicKey: 'public-key',
      algorithm: 'ES256',
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      payload: user,
      message: 'Update User sucessfully',
    });
  });

  it('should delete user by userId', async () => {
    req.headers.userId = '1';
    req.query.userId = '1';
    req.method = 'DELETE';
    await handler(req, res);
    const user = {
      id: '1',
      name: 'John',
      fullName: 'John Doe',
      email: 'john@mermer.cc',
      phone: '12345678',
      kycStatus: 'verified',
      credentialId: '1',
      publicKey: 'public-key',
      algorithm: 'ES256',
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      payload: user,
      message: 'Delete User sucessfully',
    });
  });

  it('should handle unsupported HTTP methods', async () => {
    req.headers.userId = '1';
    req.query.userId = '1';
    req.method = 'POST';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '500',
      message: 'METHOD_NOT_ALLOWED',
      payload: {},
    });
  });

  it('should handle missing userId in headers', async () => {
    req.query.userId = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '500',
      message: 'RESOURCE_NOT_FOUND',
      payload: {},
    });
  });

  it('should handle missing userId in query', async () => {
    req.headers.userId = '1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '500',
      message: 'INVALID_INPUT_PARAMETER',
      payload: {},
    });
  });

  it('should handle invalid userId', async () => {
    req.headers.userId = '1';
    req.query.userId = '2';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '500',
      message: 'RESOURCE_NOT_FOUND',
      payload: {},
    });
  });
});
