import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IInvitation } from '@/interfaces/invitation';
import { IResponseData } from '@/interfaces/response_data';
import { checkUser } from '@/lib/utils/auth_check';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompany | ICompany[]>>
) {
  try {
    if (req.method === 'PUT') {
      // Extract the necessary data from the request body
      const session = await checkUser(req, res);
      const { userId } = session;
      const { invitation } = req.body;
      if (!invitation) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const getInvitation: IInvitation = (await prisma.invitation.findUnique({
        where: {
          code: invitation as string,
        },
      })) as IInvitation;
      if (!getInvitation) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      if (getInvitation.hasUsed) {
        throw new Error(STATUS_MESSAGE.INVITATION_HAS_USED);
      }
      const { company } = await prisma.$transaction(async (tx) => {
        await tx.invitation.update({
          where: {
            id: getInvitation.id,
          },
          data: {
            hasUsed: true,
          },
        });
        const now = Date.now();
        const nowTimestamp = timestampInSeconds(now);
        const connectedCompany = await tx.admin.create({
          data: {
            user: {
              connect: {
                id: userId,
              },
            },
            role: {
              connect: {
                id: getInvitation.roleId,
              },
            },
            company: {
              connect: {
                id: getInvitation.companyId,
              },
            },
            startDate: nowTimestamp,
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
            email: getInvitation.email,
            status: true,
          },
          select: {
            company: true,
          },
        });
        return connectedCompany;
      });
      const { httpCode, result } = formatApiResponse<ICompany>(STATUS_MESSAGE.SUCCESS, company);
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
