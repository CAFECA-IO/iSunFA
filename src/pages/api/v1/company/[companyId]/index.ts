import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompany>>
) {
  const { method } = req;

  try {
    if (!req.query.companyId) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    const companyIdNum = Number(req.query.companyId);
    // Info: (20240419 - Jacky) C010002 - GET /client/:id
    if (method === 'GET') {
      const company: ICompany = (await prisma.company.findUnique({
        where: {
          id: companyIdNum,
        },
      })) as ICompany;
      if (!company) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      const { httpCode, result } = formatApiResponse<ICompany>(STATUS_MESSAGE.SUCCESS_GET, company);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) C010004 - PUT /client/:id
    } else if (method === 'PUT') {
      const { code, name, regional } = req.body;
      if (!code && !name && !regional) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const company: ICompany = await prisma.company.update({
        where: {
          id: companyIdNum,
        },
        data: {
          code,
          name,
          regional,
        },
      });
      const { httpCode, result } = formatApiResponse<ICompany>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        company
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) C010005 - DELETE /client/:id
    } else if (method === 'DELETE') {
      await prisma.admin.deleteMany({
        where: {
          companyId: companyIdNum,
        },
      });
      const company: ICompany = await prisma.company.delete({
        where: {
          id: companyIdNum,
        },
      });
      const { httpCode, result } = formatApiResponse<ICompany>(
        STATUS_MESSAGE.SUCCESS_DELETE,
        company
      );
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
