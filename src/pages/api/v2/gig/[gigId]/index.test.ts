import { handleGetRequest } from '@/pages/api/v2/gig/[gigId]';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';

describe('Gig Detail API', () => {
  let req: NextApiRequest;
  let res: NextApiResponse;

  beforeEach(() => {
    req = {
      query: {},
    } as NextApiRequest;
    res = {} as NextApiResponse;
  });

  it('should retrieve gig details with GET', async () => {
    req.query = { gigId: '1' };

    const result = await handleGetRequest(req, res);

    expect(result.statusMessage).toBe(STATUS_MESSAGE.SUCCESS);
    expect(result.payload).toEqual(
      expect.objectContaining({
        id: 1,
        companyName: 'A 公司',
        companyLogo: 'https://example.com/company-a-logo.png',
        issueType: '記帳',
        publicationDate: 1692489600,
        estimatedWorkingHours: {
          start: 1693008000,
          end: 1695600000,
        },
        deadline: 1696032000,
        hourlyWage: 500,
        caseDescription: '上傳相關憑證，徵求記帳士開立傳票',
        targetCandidates: '具有3年以上記帳經驗的記帳士',
        remarks: '需要熟悉國際會計準則',
        applicationsCount: 5,
        isMatched: false,
        createdAt: 1692489600,
        updatedAt: 1692489600,
      })
    );
  });

  it('should return NOT_FOUND if gig not found', async () => {
    req.query = { gigId: '999' };

    const result = await handleGetRequest(req, res);

    expect(result.statusMessage).toBe(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    expect(result.payload).toBeNull();
  });
});
