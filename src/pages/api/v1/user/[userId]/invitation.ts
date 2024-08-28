import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAdmin } from '@/interfaces/admin';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { IResponseData } from '@/interfaces/response_data';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { useInvitation } from '@/lib/utils/invitation';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';

async function checkInput(invitation: string): Promise<boolean> {
  return !!invitation;
}

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
      return { statusMessage, payload };
    }

    const { invitation } = req.body;
    const isValid = await checkInput(invitation);
    if (!isValid) {
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
    } else {
      const isAuth = await checkAuthorization([AuthFunctionsKeys.user], { userId });
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
