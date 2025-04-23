import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IPendingTaskTotal } from '@/interfaces/pending_task';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { countMissingCertificate } from '@/lib/utils/repo/certificate.repo';
import { countUnpostedVoucher } from '@/lib/utils/repo/voucher.repo';
import { listAccountBookByUserId } from '@/lib/utils/repo/account_book.repo';
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
 * Info: (20241018 - Jacky) Get total pending tasks for a user
 */
export async function getTotalPendingTaskForUser(userId: number): Promise<IPendingTaskTotal> {
  // Info: (20241018 - Jacky) 獲取用戶擁有的所有公司
  const listedAccountBook = await listAccountBookByUserId(userId, {});

  // Info: (20241018 - Jacky) 使用 Promise.all 同時計算每個公司的數據
  const results = await Promise.all(
    listedAccountBook.data.map(async (accountBook) => {
      const [certificateWithoutVoucherCount, voucherWithNoCertificateCount] = await Promise.all([
        countUnpostedVoucher(accountBook.id),
        countMissingCertificate(accountBook.id),
      ]);

      const imageUrl = accountBook.imageId;

      return {
        missingCertificate: {
          accountBookId: accountBook.id,
          accountBookName: accountBook.name,
          count: voucherWithNoCertificateCount,
          accountBookLogoSrc: imageUrl,
        },
        unpostedVoucher: {
          accountBookId: accountBook.id,
          accountBookName: accountBook.name,
          count: certificateWithoutVoucherCount,
          accountBookLogoSrc: imageUrl,
        },
      };
    })
  );

  // Info: (20241018 - Jacky) 計算總數和列表
  const missingCertificateList = results.map((result) => result.missingCertificate);
  const unpostedVoucherList = results.map((result) => result.unpostedVoucher);

  const totalMissingCertificate = missingCertificateList.reduce((sum, cert) => sum + cert.count, 0);
  const totalUnpostedVoucher = unpostedVoucherList.reduce((sum, voucher) => sum + voucher.count, 0);

  const totalPendingTask = totalMissingCertificate + totalUnpostedVoucher;

  let totalMissingCertificatePercentage = 0;
  let totalUnpostedVoucherPercentage = 0;

  if (totalPendingTask > 0) {
    totalMissingCertificatePercentage = parseFloat(
      (totalMissingCertificate / totalPendingTask).toFixed(2)
    );
    totalUnpostedVoucherPercentage = parseFloat(
      (totalUnpostedVoucher / totalPendingTask).toFixed(2)
    );
  }

  // Info: (20241018 - Jacky) 確保百分比不會大於 1
  if (totalMissingCertificatePercentage + totalUnpostedVoucherPercentage > 1) {
    totalMissingCertificatePercentage = 1 - totalUnpostedVoucherPercentage;
  }
  return {
    userId,
    totalMissingCertificate,
    totalMissingCertificatePercentage,
    missingCertificateList,
    totalUnpostedVoucher,
    totalUnpostedVoucherPercentage,
    unpostedVoucherList,
  };
}

/**
 * Info: (20250423 - Shirley) Handle GET request for user pending tasks
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
  const apiName = APIName.USER_PENDING_TASK_GET;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPendingTaskTotal | null = null;

  // Info: (20250423 - Shirley) Get user session
  const session = await getSession(req);
  const { userId } = session;

  // Info: (20250423 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250423 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250423 - Shirley) Validate request data
  checkRequestData(apiName, req, session);

  // Info: (20250423 - Shirley) Get pending tasks data
  loggerBack.info(`User ${userId} getting total pending tasks`);

  const totalPendingTask = await getTotalPendingTaskForUser(userId);

  if (totalPendingTask) {
    // Info: (20250423 - Shirley) Validate output data
    const { isOutputDataValid } = validateOutputData(apiName, totalPendingTask);

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    } else {
      payload = totalPendingTask;
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
  res: NextApiResponse<IResponseData<IPendingTaskTotal | null>>
) {
  let httpCode: number = HTTP_STATUS.BAD_REQUEST;
  let result: IResponseData<IPendingTaskTotal | null>;

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
