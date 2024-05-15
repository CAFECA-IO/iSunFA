import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompany | ICompany[]>>
) {
  try {
    if (!req.headers.userid) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    if (req.method === 'GET') {
      const companyList: ICompany[] = [
        {
          id: 1,
          code: 'ABC123',
          regional: 'North',
          name: 'ABC Company',
        },
        {
          id: 2,
          code: 'DEF456',
          regional: 'South',
          name: 'DEF Company',
        },
      ];
      const { httpCode, result } = formatApiResponse<ICompany[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        companyList
      );
      res.status(httpCode).json(result);
    } else if (req.method === 'POST') {
      const newCompany: ICompany = {
        id: 3,
        code: 'GHI789',
        regional: 'East',
        name: 'GHI Company',
      };
      const { httpCode, result } = formatApiResponse<ICompany>(STATUS_MESSAGE.CREATED, newCompany);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ICompany>(error.message, {} as ICompany);
    res.status(httpCode).json(result);
  }
}
