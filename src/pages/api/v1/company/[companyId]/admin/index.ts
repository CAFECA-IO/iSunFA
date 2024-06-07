import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { IAdmin } from '@/interfaces/admin';
import { checkAdmin } from '@/lib/utils/auth_check';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin | IAdmin[]>>
) {
  try {
    const session = await checkAdmin(req, res);
    const { companyId } = session;
    if (req.method === 'GET') {
      const adminList: IAdmin[] = await prisma.admin.findMany({
        where: {
          companyId,
        },
        include: {
          user: true,
          company: true,
          role: true,
        },
      });
      if (!adminList) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      const { httpCode, result } = formatApiResponse<IAdmin[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        adminList
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010003 - PUT /subscription/:id
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IAdmin>(error.message, {} as IAdmin);
    res.status(httpCode).json(result);
  }
}
