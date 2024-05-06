import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';
import version from '../../../../../../../lib/version';

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
    req.query = { id: '1' };
    await handler(req, res);
    const admin = {
      id: '1',
      name: 'bob',
      credentialId: '1',
      publicKey: '1',
      algorithm: 'ES256',
      companyId: '1',
      companyName: 'mermer',
      email: 'bob@mermer.cc',
      startDate: 21321321,
      endDate: 123123123,
      permissions: ['auditing_viewer', 'accounting_editor', 'internalControl_editor'],
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'get admin by id',
      payload: admin,
    });
  });

  it('should update admin successfully', async () => {
    req.method = 'PUT';
    req.headers.userId = '1';
    req.query = { id: '1' };
    req.body = {
      name: 'John Doe',
      email: 'john@example.com',
      startDate: 1234567890,
      permissions: ['auditing_viewer', 'accounting_editor', 'internalControl_editor'],
    };
    await handler(req, res);
    const admin = {
      id: '1',
      name: 'John Doe',
      credentialId: '1',
      publicKey: '1',
      algorithm: 'ES256',
      companyId: '1',
      companyName: 'mermer',
      email: 'john@example.com',
      startDate: 1234567890,
      endDate: 123123123,
      permissions: ['auditing_viewer', 'accounting_editor', 'internalControl_editor'],
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'Update admin successfully',
      payload: admin,
    });
  });

  it('should delete admin successfully', async () => {
    req.method = 'DELETE';
    req.headers.userId = '1';
    req.query = { id: '1' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'Delete admin successfully',
      payload: {},
    });
  });

  it('should return error for INVALID_INPUT_PARAMETER', async () => {
    req.method = 'PUT';
    req.headers.userId = '1';
    req.query = { id: '1' };
    req.body = {
      name: 'John Doe',
      email: 'john@example.com',
      startDate: 1234567890,
      auditing: 'viewer',
      accounting: 'editor',
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

  it('should return error for RESOURCE_NOT_FOUND', async () => {
    req.headers.userId = '1';
    req.query = { id: '2' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '404',
      payload: {},
      message: 'RESOURCE_NOT_FOUND',
    });
  });

  it('should return error for METHOD_NOT_ALLOWED', async () => {
    req.headers.userId = '1';
    req.method = 'POST';
    req.query = { id: '1' };
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
