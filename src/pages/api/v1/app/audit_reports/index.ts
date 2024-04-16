import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  code: string;
  regional: string;
  company: string;
  informationYear: string;
  detailedInformation: string;
  creditRating: string;
  dateOfUpload: string;
  link: string;
};

const responseDataArray: ResponseData[] = [
  {
    code: '2330',
    regional: 'TW',
    company: 'TSMC',
    informationYear: '2024 Q1',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AAA',
    dateOfUpload: '2024-04-08',
    link: 'http://www.google.com.br',
  },
  {
    code: '2234',
    regional: 'TW',
    company: 'iSunFa',
    informationYear: '2024 Q2',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AA',
    dateOfUpload: '2024-04-08',
    link: 'http://www.google.com.br',
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData[]>) {
  res.status(200).json(responseDataArray);
}
