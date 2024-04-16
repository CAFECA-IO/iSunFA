import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';

let req: NextApiRequest;
const res: jest.Mocked<NextApiResponse> = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
} as unknown as jest.Mocked<NextApiResponse>;

describe('test API', () => {
  it('should return', async () => {
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Hello from Next.js!' });
  });
});
