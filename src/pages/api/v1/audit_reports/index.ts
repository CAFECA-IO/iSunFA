import type { NextApiRequest, NextApiResponse } from 'next';
import { IAuditReports } from '@/interfaces/audit_reports';
import { IResponseData } from '@/interfaces/response_data';

const responseDataArray: IAuditReports[] = [
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

const responseDataArray2: IAuditReports[] = [
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
    code: '2330',
    regional: 'TW',
    company: 'TSMC',
    informationYear: '2024 Q2',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AAA',
    dateOfUpload: '2024-07-08',
    link: 'http://www.google.com.br',
  },
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAuditReports>>
) {
  const { region, page, limit, begin, end, search } = req.query;
  if (region || page || limit || begin || end || search) {
    const apiResponse: IResponseData<IAuditReports> = {
      powerby: 'iSunFa api 1.0.0',
      success: true,
      code: '200',
      message: 'request successful',
      payload: responseDataArray2,
    };
    res.status(200).json(apiResponse);
  } else {
    const apiResponse: IResponseData<IAuditReports> = {
      powerby: 'iSunFa api 1.0.0',
      success: true,
      code: '200',
      message: 'request successful',
      payload: responseDataArray,
    };
    res.status(200).json(apiResponse);
  }
}
