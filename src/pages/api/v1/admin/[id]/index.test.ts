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

describe('test admin API', () => {
  it('should get admin by id', async () => {
    req.headers.userId = '1';
    req.method = 'GET';
    req.query.id = '1';
    await handler(req, res);
    const admin = {
      id: '1',
      name: 'bob',
      email: 'bob@mermer.cc',
      startDate: '2021-01-01',
      auditing: 'viewer',
      accounting: 'editor',
      internalControl: 'editor',
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

  it('should update admin by id', async () => {
    req.headers.userId = '1';
    req.method = 'PUT';
    req.query.id = '1';
    req.body = {
      name: 'updated name',
      email: 'updated email',
      startDate: '2021-01-01',
      auditing: 'viewer',
      accounting: 'editor',
      internalControl: 'editor',
    };
    await handler(req, res);
    const admin = {
      id: '1',
      name: 'updated name',
      email: 'updated email',
      startDate: '2021-01-01',
      auditing: 'viewer',
      accounting: 'editor',
      internalControl: 'editor',
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

  it('should delete admin by id', async () => {
    req.headers.userId = '1';
    req.method = 'DELETE';
    req.query.id = '1';
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

  it('should return error for invalid input parameter during update', async () => {
    req.headers.userId = '1';
    req.method = 'PUT';
    req.query.id = '1';
    req.body = {
      name: '',
      email: 'updated email',
      startDate: '2021-01-01',
      auditing: 'viewer',
      accounting: 'editor',
      internalControl: 'editor',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '422',
      payload: {},
      message: 'Invalid input parameter',
    });
  });

  it('should return error for invalid method', async () => {
    req.method = 'POST';
    req.query.id = '1';
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

  it('should return error for resource not found', async () => {
    req.method = 'GET';
    req.query.id = '2';
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
});
