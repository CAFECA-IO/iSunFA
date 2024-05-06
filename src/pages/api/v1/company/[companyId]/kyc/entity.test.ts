import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import handler from './entity';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    body: {},
    query: {},
    method: '',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(() => {
  jest.clearAllMocks();
});
describe('Entity KYC handler', () => {
  it('should create Entity KYC and return status when method is POST', async () => {
    req.method = 'POST';
    req.headers.userId = 'user123';
    req.body = {
      formData: {
        // Add form data here
      },
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      message: 'create Entity KYC',
      payload: {
        status: 'Entity KYC is under review',
      },
    });
  });

  it('should return an error when method is not allowed', async () => {
    req.method = 'GET';

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

  it('should return an error when userId is missing', async () => {
    req.method = 'POST';

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
});
