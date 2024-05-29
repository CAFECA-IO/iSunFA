import { NextApiRequest, NextApiResponse } from 'next';
import { IRole } from '@/interfaces/role';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import prisma from '@/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IRole>>
) {
  const { roleId } = req.query;
  try {
    if (!req.headers.userid) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    if (!roleId) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    const roleIdNum = Number(roleId);
    // Info: (20240419 - Jacky) A010002 - GET /admin/:id
    if (req.method === 'GET') {
      const getRole: IRole = (await prisma.role.findUnique({
        where: {
          id: roleIdNum,
        },
      })) as IRole;
      if (!getRole) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      const { httpCode, result } = formatApiResponse<IRole>(STATUS_MESSAGE.SUCCESS_GET, getRole);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) A010004 - PUT /admin/:id
    } else if (req.method === 'PUT') {
      const { name, permissions } = req.body;
      if (!name || !permissions) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const updatedRole: IRole = await prisma.role.update({
        where: {
          id: roleIdNum,
        },
        data: {
          name,
          permissions,
        },
      });
      const { httpCode, result } = formatApiResponse<IRole>(STATUS_MESSAGE.SUCCESS, updatedRole);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) A010005 - DELETE /admin/:id
    } else if (req.method === 'DELETE') {
      const deletedRole: IRole = await prisma.role.delete({
        where: {
          id: roleIdNum,
        },
      });
      const { httpCode, result } = formatApiResponse<IRole>(STATUS_MESSAGE.SUCCESS, deletedRole);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IRole>(error.message, {} as IRole);
    res.status(httpCode).json(result);
  }
}
