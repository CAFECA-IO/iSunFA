import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/audit_report/index';

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

xdescribe('Result API Handler Tests', () => {
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
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expectedPayload,
      })
    );
  });
});
