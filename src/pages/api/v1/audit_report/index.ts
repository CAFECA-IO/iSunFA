import type { NextApiRequest, NextApiResponse } from 'next';
import { IAuditReports } from '@/interfaces/audit_reports';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const responseDataArray: IAuditReports[] = [
  {
    id: 1,
    companyId: 1,
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
    id: 2,
    companyId: 2,
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
    id: 3,
    companyId: 1,
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
    id: 4,
    companyId: 1,
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
  res: NextApiResponse<IResponseData<IAuditReports[] | IAuditReports>>
) {
  const { region, page, limit, begin, end, search } = req.query;
  try {
    if (region || page || limit || begin || end || search) {
      const { httpCode, result } = formatApiResponse<IAuditReports[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseDataArray2
      );
      res.status(httpCode).json(result);
    } else {
      const { httpCode, result } = formatApiResponse<IAuditReports[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseDataArray
      );
      res.status(httpCode).json(result);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IAuditReports>(
      error.message,
      {} as IAuditReports
    );
    res.status(httpCode).json(result);
  }
}
