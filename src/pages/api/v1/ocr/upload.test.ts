import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import handler from './upload';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    body: null,
    query: { id: '1' },
    method: 'GET',
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

describe('test API', () => {
  it('should return', async () => {
    req.method = 'POST';
    const mockReturn = {
      powerby: `ISunFa api ${version}`,
      success: true,
      code: '200',
      message: 'upload {numberOfImage} images sucessfully',
      payload: [
        {
          resultId: '20240416-001-001',
          status: 'success',
        },
        {
          resultId: '20240416-001-002',
          status: 'inProgress',
        },
      ],
    };

    handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockReturn);
  });

  it('should return 405 for invalid request method', async () => {
    req.method = 'PUT';
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '405',
      message: 'Method Not Allowed in upload images api',
    });
  });
});
