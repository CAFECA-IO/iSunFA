import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import prisma from '@/client';
import { IRole } from '@/interfaces/role';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IRole | IRole[]>>
) {
  try {
    if (req.method === 'GET') {
      // Info: (20240509 - Jacky) get all roles
      const roleList: IRole[] = await prisma.role.findMany();

      const { httpCode, result } = formatApiResponse<IRole[]>(
        STATUS_MESSAGE.SUCCESS_LIST,
        roleList
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) A010003 - POST /role
    } else if (req.method === 'POST') {
      const { name } = req.body;
      if (!name) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const now = Date.now();
      const nowTimestamp = timestampInSeconds(now);
      const createdRole = await prisma.role.create({
        data: {
          name,
          permissions: ['auditing_editor', 'accounting_editor', 'internalControl_editor'],
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
      });

      const { httpCode, result } = formatApiResponse<IRole>(STATUS_MESSAGE.CREATED, createdRole);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IRole | IRole[]>(error.message, {} as IRole);
    res.status(httpCode).json(result);
  }
}
