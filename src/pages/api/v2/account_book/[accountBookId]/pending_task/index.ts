import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IPendingTask } from '@/interfaces/pending_task';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { countMissingCertificate } from '@/lib/utils/repo/certificate.repo';
import { countUnpostedVoucher } from '@/lib/utils/repo/voucher.repo';
import { getAccountBookById } from '@/lib/utils/repo/account_book.repo';
import { getSession } from '@/lib/utils/session';
import {
  checkSessionUser,
  checkUserAuthorization,
  checkRequestData,
  logUserAction,
} from '@/lib/utils/middleware';
import { validateOutputData } from '@/lib/utils/validator';
import loggerBack from '@/lib/utils/logger_back';
import { HTTP_STATUS } from '@/constants/http';

/**
 * Info: (20241105 - Jacky) Get pending task by company id
 */
export async function getPendingTaskByCompanyId(
  userId: number,
  accountBookId: number
): Promise<IPendingTask | null> {
  let pendingTask: IPendingTask | null = null;

  const company = await getAccountBookById(accountBookId);
  if (company) {
    const [missingCertificateCount, unpostedVoucherCount] = await Promise.all([
      countMissingCertificate(accountBookId),
      countUnpostedVoucher(accountBookId),
    ]);

    const totalPendingTask = missingCertificateCount + unpostedVoucherCount;

    let missingCertificatePercentage = 0;
    let unpostedVoucherPercentage = 0;

    if (totalPendingTask > 0) {
      missingCertificatePercentage = parseFloat(
        (missingCertificateCount / totalPendingTask).toFixed(2)
      );
      unpostedVoucherPercentage = parseFloat((unpostedVoucherCount / totalPendingTask).toFixed(2));
    }

    if (missingCertificatePercentage + unpostedVoucherPercentage > 1) {
      missingCertificatePercentage = 1 - unpostedVoucherPercentage;
    }

    const imageUrl = company.imageId;
    pendingTask = {
      accountBookId,
      missingCertificate: {
        accountBookId: company.id,
        accountBookName: company.name,
        count: missingCertificateCount,
        accountBookLogoSrc: imageUrl,
      },
      missingCertificatePercentage,
      unpostedVoucher: {
        accountBookId: company.id,
        accountBookName: company.name,
        count: unpostedVoucherCount,
        accountBookLogoSrc: imageUrl,
      },
      unpostedVoucherPercentage,
    };
  }

  return pendingTask;
}

/**
 * Info: (20250423 - Shirley) Handle GET request for pending tasks
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Get pending tasks data
 * 6. Validate output data
 * 7. Log user action and return response
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const apiName = APIName.ACCOUNT_BOOK_PENDING_TASK_GET;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPendingTask | null = null;

  // Info: (20250423 - Shirley) Get user session
  const session = await getSession(req);
  const { userId } = session;

  // Info: (20250423 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250423 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250423 - Shirley) Validate request data
  const { query } = checkRequestData(apiName, req, session);
  if (query === null || query.accountBookId === undefined) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250423 - Shirley) Get pending tasks data
  const { accountBookId } = query;
  loggerBack.info(`User ${userId} get pending task for accountBookId: ${accountBookId}`);

  const pendingTask = await getPendingTaskByCompanyId(userId, accountBookId);

  if (pendingTask) {
    // Info: (20250423 - Shirley) Validate output data
    const { isOutputDataValid, outputData } = validateOutputData(apiName, pendingTask);

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    } else {
      payload = outputData;
      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    }
  }

  // Info: (20250423 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
};

/**
 * Info: (20250423 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPendingTask | null>>
) {
  let httpCode: number = HTTP_STATUS.BAD_REQUEST;
  let result: IResponseData<IPendingTask | null>;

  try {
    // Info: (20250423 - Shirley) Handle different HTTP methods
    const method = req.method || '';
    switch (method) {
      case HttpMethod.GET:
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      default:
        // Info: (20250423 - Shirley) Method not allowed
        ({ httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
    }
  } catch (_error) {
    // Info: (20250423 - Shirley) Error handling
    const error = _error as Error;
    const statusMessage = error.message;
    ({ httpCode, result } = formatApiResponse(statusMessage, null));
  }

  // Info: (20250423 - Shirley) Send response
  res.status(httpCode).json(result);
}
