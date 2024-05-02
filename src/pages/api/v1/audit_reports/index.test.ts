import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    body: null,
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

describe('Result API Handler Tests', () => {
  it('should handle GET requests successfully', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const expectedPayload = expect.arrayContaining([
      expect.objectContaining({
        code: expect.any(String),
        regional: expect.any(String),
        company: expect.any(String),
        informationYear: expect.any(String),
        detailedInformation: expect.any(String),
        creditRating: expect.any(String),
        dateOfUpload: expect.any(String),
        link: expect.any(String),
      }),
    ]);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFa api 1.0.0',
      success: true,
      code: '200',
      message: 'request successful',
      payload: expectedPayload,
    });
  });
});
