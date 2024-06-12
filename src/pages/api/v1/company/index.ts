import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { IRole } from '@/interfaces/role';
import { checkUser } from '@/lib/utils/auth_check';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<{ company: ICompany; role: IRole } | Array<{ company: ICompany; role: IRole }>>
  >
) {
  try {
    const session = await checkUser(req, res);
    const { userId } = session;
    if (req.method === 'GET') {
      const companyRoleList: Array<{ company: ICompany; role: IRole }> =
        await prisma.admin.findMany({
          where: {
            userId,
          },
          select: {
            company: true,
            role: true,
          },
        });
      const { httpCode, result } = formatApiResponse<Array<{ company: ICompany; role: IRole }>>(
        STATUS_MESSAGE.SUCCESS_GET,
        companyRoleList
      );
      res.status(httpCode).json(result);
    } else if (req.method === 'POST') {
      const { code, name, regional } = req.body;
      if (!code || !name || !regional) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const now = Date.now();
      const nowTimestamp = timestampInSeconds(now);
      const newCompanyRoleList: { company: ICompany; role: IRole } = await prisma.admin.create({
        data: {
          user: {
            connect: {
              id: userId,
            },
          },
          company: {
            create: {
              code,
              name,
              regional,
              kycStatus: false,
              createdAt: nowTimestamp,
              updatedAt: nowTimestamp,
              startDate: nowTimestamp,
            },
          },
          role: {
            connectOrCreate: {
              where: {
                name: 'ADMIN',
              },
              create: {
                name: 'ADMIN',
                permissions: ['read'],
                createdAt: nowTimestamp,
                updatedAt: nowTimestamp,
              },
            },
          },
          // Todo: (20240517 - Jacky) Maybe need to force a email?
          email: '',
          status: true,
          startDate: nowTimestamp,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
        select: {
          company: true,
          role: true,
        },
      });
      const { httpCode, result } = formatApiResponse<{ company: ICompany; role: IRole }>(
        STATUS_MESSAGE.CREATED,
        newCompanyRoleList
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<{ company: ICompany; role: IRole }>(
      error.message,
      {} as { company: ICompany; role: IRole }
    );
    res.status(httpCode).json(result);
  }
}
