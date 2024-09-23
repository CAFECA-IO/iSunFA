import { NextApiRequest, NextApiResponse } from 'next';

const gigs = [
  {
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
  },
  {
    id: 2,
    companyName: 'B 公司',
    companyLogo: 'https://example.com/company-b-logo.png',
    issueType: '稅務',
    publicationDate: 1692499600,
    estimatedWorkingHours: {
      start: 1693526400,
      end: 1698768000,
    },
    deadline: 1699920000,
    hourlyWage: 600,
    caseDescription: '協助處理年度稅務申報',
    targetCandidates: '有稅務申報經驗的會計師或記帳士',
    remarks: '需要了解最新的稅務法規',
    applicationsCount: 3,
    isMatched: true,
    createdAt: 1692489600,
    updatedAt: 1692489600,
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { gigId } = req.query;

  if (req.method === 'GET') {
    const gig = gigs.find((g) => g.id === parseInt(gigId as string, 10));
    if (gig) {
      res.status(200).json({
        powerby: 'iSunFA v2.0.0+1',
        success: true,
        code: '200',
        message: 'Successfully retrieved gig details',
        payload: gig,
      });
    } else {
      res.status(404).json({
        powerby: 'iSunFA v2.0.0+1',
        success: false,
        code: '404',
        message: 'Gig not found',
        payload: {},
      });
    }
  } else {
    res.status(405).json({
      powerby: 'iSunFA v2.0.0+1',
      success: false,
      code: '405',
      message: 'Method not allowed',
      payload: {},
    });
  }
}
