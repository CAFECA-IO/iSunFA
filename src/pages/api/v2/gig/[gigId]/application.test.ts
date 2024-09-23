import handler from '@/pages/api/v2/gig/[gigId]/application';
import { NextApiRequest, NextApiResponse } from 'next';

describe('Gig Application API', () => {
  let req: NextApiRequest;
  let res: NextApiResponse;

  beforeEach(() => {
    req = {} as NextApiRequest;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as NextApiResponse;
  });

  it('should create an application with POST', async () => {
    req.method = 'POST';
    req.query = { gigId: '1' };
    req.body = { content: 'application content' };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v2.0.0+1',
      success: true,
      code: '200',
      message: 'Application created successfully',
      payload: expect.any(Object),
    });
  });

  it('should return 400 for invalid input', async () => {
    req.method = 'POST';
    req.query = { gigId: '1' };
    req.body = { invalidField: 'invalid content' };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v2.0.0+1',
      success: false,
      code: '400',
      message: 'Invalid input',
      payload: {},
    });
  });

  it('should return 405 for non-POST methods', async () => {
    req.method = 'GET';
    req.query = { gigId: '1' };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v2.0.0+1',
      success: false,
      code: '405',
      message: 'Method not allowed',
      payload: {},
    });
  });
});
