import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import prisma from '@/../prisma/client';
import { IRole } from '@/interfaces/role';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IRole | IRole[]>>
) {
  try {
    if (req.method === 'GET') {
      // get all roles
      const rawRoleList = await prisma.role.findMany({
        include: {
          company: {
            select: {
              name: true,
            },
          },
        },
      });
      const roleList: IRole[] = rawRoleList.map((role) => ({
        ...role,
        companyName: role.company.name,
        company: null,
      }));

      const { httpCode, result } = formatApiResponse<IRole[]>(
        STATUS_MESSAGE.SUCCESS_LIST,
        roleList
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) A010003 - POST /role
    } else if (req.method === 'POST') {
      const { name } = req.body;
      // console.log('name:', name);
      if (!name) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const createdRole = await prisma.role.create({
        data: {
          name,
          company: {
            connect: {
              id: 1,
            },
          },
          permissions: ['auditing_editor', 'accounting_editor', 'internalControl_editor'],
        },
        include: {
          company: {
            select: {
              name: true,
            },
          },
        },
      });
      // const { company, ...role } = createdRole;
      const formattedRole: IRole = {
        ...createdRole,
        companyName: createdRole.company.name,
      };

      const { httpCode, result } = formatApiResponse<IRole>(STATUS_MESSAGE.CREATED, formattedRole);
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
