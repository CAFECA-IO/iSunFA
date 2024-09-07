import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAdmin } from '@/interfaces/admin';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { IResponseData } from '@/interfaces/response_data';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { isInvitationValid, useInvitation } from '@/lib/utils/invitation';
import { getInvitationByCode } from '@/lib/utils/repo/invitation.repo';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';

export async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ statusMessage: string; payload: IAdmin | null }> {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAdmin | null = null;

  try {
    const session = await getSession(req, res);
    const { userId } = session;
    if (!userId) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
    } else {
      const { invitationCode } = req.body;
      // ToDo: (20240829 - Jacky) Add type guard for invitationCode
      const getInvitation = await getInvitationByCode(invitationCode);
      if (!getInvitation) {
        statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      } else {
        const isValid = await isInvitationValid(getInvitation);
        if (!isValid) {
          statusMessage = STATUS_MESSAGE.BAD_REQUEST;
        } else {
          const isAuth = await checkAuthorization([AuthFunctionsKeys.user], { userId });
          if (!isAuth) {
            statusMessage = STATUS_MESSAGE.FORBIDDEN;
          } else {
            const admin = await useInvitation(getInvitation, userId);
            statusMessage = admin
              ? STATUS_MESSAGE.CREATED_INVITATION
              : STATUS_MESSAGE.INVITATION_CONFLICT;
            payload = admin;
          }
        }
      }
    }
  } catch (error) {
    statusMessage = (error as Error).message;
    payload = null;
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAdmin | null }>;
} = {
  PUT: handlePutRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAdmin | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (error) {
    statusMessage = (error as Error).message;
  }

  const { httpCode, result } = formatApiResponse<IAdmin | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
