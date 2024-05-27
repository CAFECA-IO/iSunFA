import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/get_session';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompany | ICompany[]>>
) {
  try {
    if (req.method === 'GET') {
      const session = await getSession(req, res);
      const { userId } = session;
      if (!userId) {
        throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
      }
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
      const nowTimestamp = timestampInSeconds(Date.now());
      const newCompany: ICompany = await prisma.company.create({
        data: {
          code,
          name,
          regional,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
          // Todo: (20240527 - Jacky) Maybe get by frontend?
          startDate: nowTimestamp,
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
