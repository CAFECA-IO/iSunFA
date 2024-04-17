import { NextApiRequest, NextApiResponse } from 'next';
import handler from './result';

const req: jest.Mocked<NextApiRequest> = {
  headers: {},
  body: null,
  query: { id: '1' },
  json: jest.fn(),
} as unknown as jest.Mocked<NextApiRequest>;

const res: jest.Mocked<NextApiResponse> = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
} as unknown as jest.Mocked<NextApiResponse>;

describe('test API', () => {
  it('should return', async () => {
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
