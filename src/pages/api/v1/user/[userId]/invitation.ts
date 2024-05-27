import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IInvitation } from '@/interfaces/invitation';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/get_session';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvitation | IInvitation[]>>
) {
  try {
    if (req.method === 'PUT') {
      // Extract the necessary data from the request body
      const session = await getSession(req, res);
      const { userId } = session;
      if (!userId) {
        throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
      }
      const { invitation } = req.body;
      if (!invitation) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const userIdNum = Number(userId);
      // Perform any necessary validation on the data
      const user: IUser = (await prisma.user.findUnique({
        where: {
          id: userIdNum,
        },
      })) as IUser;
      if (!user) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
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
      const usedInvitation: IInvitation = await prisma.$transaction(async (tx) => {
        await tx.userCompanyRole.create({
          data: {
            user: {
              connect: {
                id: userIdNum,
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
            startDate: timestampInSeconds(Date.now()),
          },
        });
        const updatedInvitation: IInvitation = await tx.invitation.update({
          where: {
            id: getInvitation.id,
          },
          data: {
            hasUsed: true,
          },
        });
        return updatedInvitation;
      });
      const { httpCode, result } = formatApiResponse<IInvitation>(
        STATUS_MESSAGE.SUCCESS,
        usedInvitation
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IInvitation>(error.message, {} as IInvitation);
    res.status(httpCode).json(result);
  }
}
