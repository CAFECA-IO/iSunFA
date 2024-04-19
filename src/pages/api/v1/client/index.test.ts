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
    } as NextApiRequest;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as NextApiResponse;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a list of clients when method is GET', async () => {
    req.method = 'GET';
    req.headers.userId = 'user123';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'list all clients',
      payload: [
        {
          id: '1',
          name: 'cafeca',
          code: '1234',
          favorite: false,
        },
        {
          id: '2',
          name: 'isunfa',
          code: '3333',
          favorite: false,
        },
      ],
    });
  });

  it('should create a new client when method is POST', async () => {
    req.method = 'POST';
    req.headers.userId = 'user123';
    req.body = {
      name: 'newClient',
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
        id: '3',
        name: 'newClient',
        code: '5678',
        favorite: false,
      },
    });
  });

  it('should return an error when method is not allowed', async () => {
    req.method = 'PUT';

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
});
