import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkRequestData, checkSessionUser, checkUserAuthorization } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { FAKE_TEAM_ACCOUNT_BOOKS } from '@/constants/team';
import { ITransferLedger, TransferStatus } from '@/interfaces/team';

const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITransferLedger | null = null;

  const isLogin = await checkSessionUser(session, APIName.TRANSFER_ACCOUNT_BOOK, req);
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  const isAuth = await checkUserAuthorization(APIName.TRANSFER_ACCOUNT_BOOK, req, session);
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const { body } = checkRequestData(APIName.TRANSFER_ACCOUNT_BOOK, req, session);
  if (!body || !body.targetTeamId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const accountBook =
    FAKE_TEAM_ACCOUNT_BOOKS[Math.floor(Math.random() * FAKE_TEAM_ACCOUNT_BOOKS.length)];

  loggerBack.info(
    `Transfer Ledger by userId: ${userId} from team ${req.query.accountBookId} to ${body.targetTeamId}`
  );

  statusMessage = STATUS_MESSAGE.SUCCESS;
  payload = {
    accountBookId: req.query.accountBookId as string,
    previousTeamId: accountBook.teamId,
    targetTeamId: body.targetTeamId,
    status: TransferStatus.TRANSFER,
    transferedAt: Math.floor(Date.now() / 1000),
  };

  const result = formatApiResponse(statusMessage, payload);
  return result;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;

  try {
    if (req.method === 'POST') {
      ({ httpCode, result } = await handlePostRequest(req));
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (error) {
    const err = error as Error;
    ({ httpCode, result } = formatApiResponse<null>(
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE],
      null
    ));
  }

  res.status(httpCode).json(result);
}
