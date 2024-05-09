import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_CODE } from '@/constants/status_code';
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
        id: role.id.toString(), // Convert the id to a string
        companyId: role.companyId.toString(), // Convert the companyId to a string
        companyName: role.company.name,
        company: null,
      }));

      const { httpCode, result } = formatApiResponse<IRole[]>(STATUS_CODE.SUCCESS_LIST, roleList);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) A010003 - POST /role
    } else if (req.method === 'POST') {
      const { name, email } = req.body;
      if (!name || !email) {
        throw new Error(STATUS_CODE.INVALID_INPUT_PARAMETER);
      }
      const createdRole = await prisma.role.create({
        data: {
          name,
          company: {
            connect: {
              id: 1,
            },
          },
          startDate: new Date().toISOString(),
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
      const { company, ...role } = createdRole;
      const formattedRole: IRole = {
        ...role,
        id: role.id.toString(), // Convert the id to a string
        companyId: role.companyId.toString(), // Convert the companyId to a string
        companyName: company.name,
      };

      const { httpCode, result } = formatApiResponse<IRole>(STATUS_CODE.CREATED, formattedRole);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_CODE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IRole | IRole[]>(error.message, {} as IRole);
    res.status(httpCode).json(result);
  }
}
