import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IPendingTaskTotal } from '@/interfaces/pending_task';
import { formatApiResponse } from '@/lib/utils/common';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { listCompanyByUserId } from '@/lib/utils/repo/admin.repo';
import { countMissingCertificate } from '@/lib/utils/repo/certificate.repo';
import { countUnpostedVoucher } from '@/lib/utils/repo/voucher.repo';

export async function getTotalPendingTaskForUser(userId: number): Promise<IPendingTaskTotal> {
  // Info: (20241018 - Jacky) 獲取用戶擁有的所有公司
  const listedCompany = await listCompanyByUserId(userId);

  // Info: (20241018 - Jacky) 使用 Promise.all 同時計算每個公司的數據
  const results = await Promise.all(
    listedCompany.map(async ({ company }) => {
      const [missingCertificateCount, unpostedVoucherCount] = await Promise.all([
        countMissingCertificate(company.id),
        countUnpostedVoucher(company.id),
      ]);

      return {
        missingCertificate: {
          companyId: company.id,
          companyName: company.name,
          count: missingCertificateCount,
        },
        unpostedVoucher: {
          companyId: company.id,
          companyName: company.name,
          count: unpostedVoucherCount,
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

// ToDo: (20240924 - Jacky) Implement the logic to get the pending tasks data from the database
const handleGetRequest: IHandleRequest<APIName.USER_PENDING_TASK_GET, IPendingTaskTotal> = async ({
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPendingTaskTotal | null = null;

  // ToDo: (20241018 - Jacky) Get userId from query after new auth check
  const { userId } = session;
  const totalPendingTask = await getTotalPendingTaskForUser(userId);
  payload = totalPendingTask;
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IPendingTaskTotal | null }>;
} = {
  GET: (req, res) =>
    withRequestValidation(APIName.USER_PENDING_TASK_GET, req, res, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPendingTaskTotal | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPendingTaskTotal | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IPendingTaskTotal | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
