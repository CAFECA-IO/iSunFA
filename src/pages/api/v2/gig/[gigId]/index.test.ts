import handler from '@/pages/api/v2/gig/[gigId]';
import { NextApiRequest, NextApiResponse } from 'next';

describe('Gig Detail API', () => {
  let req: NextApiRequest;
  let res: NextApiResponse;

  beforeEach(() => {
    req = {} as NextApiRequest;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as NextApiResponse;
  });

  it('should retrieve gig details with GET', async () => {
    req.method = 'GET';
    req.query = { gigId: '1' };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v2.0.0+1',
      success: true,
      code: '200',
      message: 'Successfully retrieved gig details',
      payload: expect.any(Object),
    });
  });

  it('should return 404 if gig not found', async () => {
    req.method = 'GET';
    req.query = { gigId: '999' };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v2.0.0+1',
      success: false,
      code: '404',
      message: 'Gig not found',
      payload: {},
    });
  });

  it('should return 405 for non-GET methods', async () => {
    req.method = 'POST';
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
