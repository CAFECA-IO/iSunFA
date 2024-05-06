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
    const adminList = [
      {
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
      },
      {
        id: '2',
        name: 'alice',
        companyId: '1',
        companyName: 'mermer',
        credentialId: '2',
        publicKey: '2',
        algorithm: 'ES256',
        email: 'alice@mermer.cc',
        startDate: 134214124,
        endDate: 123123123,
        permissions: ['auditing_editor', 'accounting_editor', 'internalControl_editor'],
      },
    ];
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'list all admins',
      payload: adminList,
    });
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
