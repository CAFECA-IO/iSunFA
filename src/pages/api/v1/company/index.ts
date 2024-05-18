import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompany | ICompany[]>>
) {
  try {
    if (!req.headers.userid) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    if (req.method === 'GET') {
      const companyList: ICompany[] = await prisma.company.findMany();
      const { httpCode, result } = formatApiResponse<ICompany[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        companyList
      );
      res.status(httpCode).json(result);
    } else if (req.method === 'POST') {
      const { code, name, regional } = req.body;
      if (!code || !name || !regional) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const newCompany: ICompany = await prisma.company.create({
        data: {
          code,
          name,
          regional,
        },
      });
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
