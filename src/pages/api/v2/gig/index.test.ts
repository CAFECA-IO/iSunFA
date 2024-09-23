import handler from '@/pages/api/v2/gig';
import { NextApiRequest, NextApiResponse } from 'next';

describe('Gig API', () => {
  let req: NextApiRequest;
  let res: NextApiResponse;

  beforeEach(() => {
    req = {} as NextApiRequest;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as NextApiResponse;
  });

  it('should list all gigs with GET', async () => {
    req.method = 'GET';
    req.query = { page: '1', pageSize: '10' };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v2.0.0+1',
      success: true,
      code: '200',
      message: 'Successfully listed all gigs',
      payload: {
        totalPages: 1,
        currentPage: 1,
        gigs: expect.any(Array),
      },
    });
  });

  it('should filter gigs by isMatched', async () => {
    req.method = 'GET';
    req.query = { isMatched: 'true', page: '1', pageSize: '10' };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v2.0.0+1',
      success: true,
      code: '200',
      message: 'Successfully listed all gigs',
      payload: {
        totalPages: 1,
        currentPage: 1,
        gigs: expect.arrayContaining([expect.objectContaining({ isMatched: true })]),
      },
    });
  });

  it('should filter gigs by startDate and endDate', async () => {
    req.method = 'GET';
    req.query = { startDate: '1692489600', endDate: '1692499600', page: '1', pageSize: '10' };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v2.0.0+1',
      success: true,
      code: '200',
      message: 'Successfully listed all gigs',
      payload: {
        totalPages: 1,
        currentPage: 1,
        gigs: expect.any(Array),
      },
    });
  });

  it('should filter gigs by searchQuery', async () => {
    req.method = 'GET';
    req.query = { searchQuery: '記帳', page: '1', pageSize: '10' };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v2.0.0+1',
      success: true,
      code: '200',
      message: 'Successfully listed all gigs',
      payload: {
        totalPages: 1,
        currentPage: 1,
        gigs: expect.arrayContaining([
          expect.objectContaining({ caseDescription: expect.stringContaining('記帳') }),
        ]),
      },
    });
  });

  it('should return 405 for non-GET methods', async () => {
    req.method = 'POST';

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
