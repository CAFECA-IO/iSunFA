import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';
import version from '../../../../lib/version';

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

describe('test user API', () => {
  it('should list all users', async () => {
    await handler(req, res);
    const users = [
      {
        id: '1',
        name: 'John',
        fullName: 'John Doe',
        email: 'john@mermer.cc',
        phone: '12345678',
        kycStatus: 'verified',
        credentialId: '1',
        publicKey: 'public-key',
        algorithm: 'ES256',
      },
      {
        id: '2',
        name: 'Jane',
        credentialId: '2',
        publicKey: 'public-key',
        algorithm: 'ES256',
      },
    ];
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      payload: users,
      message: 'List Users sucessfully',
    });
  });

  it('should create a new user', async () => {
    req.method = 'POST';
    req.body = { name: 'Jane' };
    await handler(req, res);
    const newUser = {
      id: '2',
      name: 'Jane',
      credentialId: '2',
      publicKey: 'public-key',
      algorithm: 'ES256',
    };
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      payload: newUser,
      message: 'Create User sucessfully',
    });
  });

  it('should handle unsupported HTTP methods', async () => {
    req.method = 'PUT';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '500',
      message: 'Method Not Allowed',
      payload: {},
    });
  });
});
