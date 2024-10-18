import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IPendingTask } from '@/interfaces/pending_task';
import { formatApiResponse } from '@/lib/utils/common';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { getCompanyByUserIdAndCompanyId } from '@/lib/utils/repo/admin.repo';
import { countMissingCertificate } from '@/lib/utils/repo/certificate.repo';
import { countUnpostedVoucher } from '@/lib/utils/repo/voucher.repo';

async function getPendingTaskByCompanyId(
  userId: number,
  companyId: number
): Promise<IPendingTask | null> {
  let pendingTask: IPendingTask | null = null;

  const company = await getCompanyByUserIdAndCompanyId(userId, companyId);
  if (company) {
    const [missingCertificateCount, unpostedVoucherCount] = await Promise.all([
      countMissingCertificate(companyId),
      countUnpostedVoucher(companyId),
    ]);

    const totalPendingTask = missingCertificateCount + unpostedVoucherCount;
    const missingCertificatePercentage = totalPendingTask
      ? parseFloat((missingCertificateCount / totalPendingTask).toFixed(2))
      : 0;
    const unpostedVoucherPercentage = totalPendingTask
      ? parseFloat((unpostedVoucherCount / totalPendingTask).toFixed(2))
      : 0;

    pendingTask = {
      companyId,
      missingCertificate: {
        companyId: company.id,
        companyName: company.name,
        count: missingCertificateCount,
      },
      missingCertificatePercentage,
      unpostedVoucher: {
        companyId: company.id,
        companyName: company.name,
        count: unpostedVoucherCount,
      },
      unpostedVoucherPercentage,
    };
  }

  return pendingTask;
}

const handleGetRequest: IHandleRequest<APIName.COMPANY_PENDING_TASK_GET, IPendingTask> = async ({
  session,
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPendingTask | null = null;

  // ToDo: (20241018 - Jacky) Get userId from query after new auth check
  const { userId } = session;
  const { companyId } = query;
  const pendingTask = await getPendingTaskByCompanyId(userId, companyId);
  if (pendingTask) {
    payload = pendingTask;
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IPendingTask | null }>;
} = {
  GET: (req, res) =>
    withRequestValidation(APIName.COMPANY_PENDING_TASK_GET, req, res, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPendingTask | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPendingTask | null = null;

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
    const { httpCode, result } = formatApiResponse<IPendingTask | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
