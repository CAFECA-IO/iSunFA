import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import handler from './index';

describe('API handler', () => {
  let req: NextApiRequest;
  let res: NextApiResponse;

  beforeEach(() => {
    req = {
      method: '',
      headers: {},
      body: {},
      query: {},
    } as NextApiRequest;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as NextApiResponse;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a client when method is GET', async () => {
    req.method = 'GET';
    req.headers.userId = 'user123';
    req.query.id = '1';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'list all clients',
      payload: {
        id: '1',
        name: 'cafeca',
        code: '1234',
        favorite: false,
      },
    });
  });

  it('should update a client when method is PUT', async () => {
    req.method = 'PUT';
    req.headers.userId = 'user123';
    req.query.id = '1';
    req.body = {
      name: 'newName',
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
        id: '1',
        name: 'newName',
        code: '5678',
        favorite: false,
      },
    });
  });

  it('should delete a client when method is DELETE', async () => {
    req.method = 'DELETE';
    req.headers.userId = 'user123';
    req.query.id = '1';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'delete 1 client',
      payload: {
        id: '1',
        name: 'cafeca',
        code: '1234',
        favorite: false,
      },
    });
  });

  it('should return an error when method is not allowed', async () => {
    req.method = 'POST';

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

  it('should return an error when userId is missing', async () => {
    req.method = 'GET';

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
  it('should return an error when id is missing', async () => {
    req.method = 'PUT';
    req.headers.userId = 'user123';

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
});
