import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAdmin } from '@/interfaces/admin';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { useInvitation } from '@/lib/utils/invitation';
import { getUserById } from '@/lib/utils/repo/user.repo';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';

async function checkInput(invitation: string): Promise<boolean> {
  return !!invitation;
}

async function checkAuth(userId: number): Promise<boolean> {
  const user = await getUserById(userId);
  return !!user;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAdmin | null = null;
  try {
    switch (req.method) {
      case 'PUT': {
        const session = await getSession(req, res);
        const { userId } = session;
        const { invitation } = req.body;
        const isValid = await checkInput(invitation);
        if (!isValid) {
          statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
        } else {
          const isAuth = await checkAuth(userId);
          if (!isAuth) {
            statusMessage = STATUS_MESSAGE.FORBIDDEN;
          } else {
            const admin = await useInvitation(invitation, userId);
            statusMessage = admin
              ? STATUS_MESSAGE.CREATED_INVITATION
              : STATUS_MESSAGE.INVITATION_HAS_USED;
            payload = admin;
          }
        }
        break;
      }
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        break;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  }
  const { httpCode, result } = formatApiResponse<IAdmin | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
