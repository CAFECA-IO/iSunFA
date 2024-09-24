import { handleGetRequest } from '@/pages/api/v2/gig';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';

describe('Gig API', () => {
  let req: NextApiRequest;
  let res: NextApiResponse;

  beforeEach(() => {
    req = {
      query: {},
    } as NextApiRequest;
    res = {} as NextApiResponse;
  });

  it('should list all gigs with GET', async () => {
    req.query = { page: '1', pageSize: '10' };

    const result = await handleGetRequest(req, res);

    expect(result.statusMessage).toBe(STATUS_MESSAGE.SUCCESS);
    expect(result.payload).toEqual(
      expect.objectContaining({
        data: expect.any(Array),
        page: 1,
        totalPages: expect.any(Number),
        totalCount: expect.any(Number),
        pageSize: 10,
        hasNextPage: expect.any(Boolean),
        hasPreviousPage: expect.any(Boolean),
        sort: expect.arrayContaining([
          expect.objectContaining({
            sortBy: 'publicationDate',
            sortOrder: 'desc',
          }),
        ]),
      })
    );
  });

  it('should filter gigs by isMatched', async () => {
    req.query = { isMatched: 'true', page: '1', pageSize: '10' };

    const result = await handleGetRequest(req, res);

    expect(result.statusMessage).toBe(STATUS_MESSAGE.SUCCESS);
    expect(result.payload?.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ isMatched: true })])
    );
  });

  it('should filter gigs by startDate and endDate', async () => {
    req.query = { startDate: '1692489600', endDate: '1692499600', page: '1', pageSize: '10' };

    const result = await handleGetRequest(req, res);

    expect(result.statusMessage).toBe(STATUS_MESSAGE.SUCCESS);
    expect(
      result.payload?.data.every(
        (gig) => gig.publicationDate >= 1692489600 && gig.publicationDate <= 1692499600
      )
    ).toBe(true);
  });

  it('should filter gigs by searchQuery', async () => {
    req.query = { searchQuery: '記帳', page: '1', pageSize: '10' };

    const result = await handleGetRequest(req, res);

    expect(result.statusMessage).toBe(STATUS_MESSAGE.SUCCESS);
    expect(result.payload?.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          caseDescription: expect.stringContaining('記帳'),
        }),
      ])
    );
  });
});
