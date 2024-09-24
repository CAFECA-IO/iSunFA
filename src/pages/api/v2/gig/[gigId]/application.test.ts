import { handlePostRequest } from '@/pages/api/v2/gig/[gigId]/application';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';

describe('Gig Application API', () => {
  let req: NextApiRequest;
  let res: NextApiResponse;

  beforeEach(() => {
    req = {
      query: {},
      body: {},
    } as NextApiRequest;
    res = {} as NextApiResponse;
  });

  it('should create an application with POST', async () => {
    req.query = { gigId: '1' };
    req.body = { content: 'application content' };

    const result = await handlePostRequest(req, res);

    expect(result.statusMessage).toBe(STATUS_MESSAGE.CREATED);
    expect(result.payload).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        bookkeeperId: expect.any(Number),
        gigId: 1,
        content: 'application content',
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      })
    );
  });

  it('should return INVALID_INPUT for invalid input', async () => {
    req.query = { gigId: '1' };
    req.body = { invalidField: 'invalid content' };

    const result = await handlePostRequest(req, res);
    // ToDo: check error message (20240924 - Shirley)
    expect(result.statusMessage).toBe(STATUS_MESSAGE.BAD_REQUEST);
    expect(result.payload).toBeNull();
  });
});
