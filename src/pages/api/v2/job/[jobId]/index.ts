import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { Job } from '@/pages/api/v2/job/index';

const jobs: Job[] = [
  {
    id: 1,
    companyName: 'A 公司',
    companyLogo: 'https://example.com/company-a-logo.png',
    issueType: '記帳',
    publicationDate: 1692489600,
    estimatedWorkingHours: {
      start: 1693008000,
      end: 1695600000,
    },
    deadline: 1696032000,
    hourlyWage: 500,
    caseDescription: '上傳相關憑證，徵求記帳士開立傳票',
    targetCandidates: '具有3年以上記帳經驗的記帳士',
    remarks: '需要熟悉國際會計準則',
    applicationsCount: 5,
    isMatched: false,
    createdAt: 1692489600,
    updatedAt: 1692489600,
  },
  {
    id: 2,
    companyName: 'B 公司',
    companyLogo: 'https://example.com/company-b-logo.png',
    issueType: '稅務',
    publicationDate: 1692499600,
    estimatedWorkingHours: {
      start: 1693526400,
      end: 1698768000,
    },
    deadline: 1699920000,
    hourlyWage: 600,
    caseDescription: '協助處理年度稅務申報',
    targetCandidates: '有稅務申報經驗的會計師或記帳士',
    remarks: '需要了解最新的稅務法規',
    applicationsCount: 3,
    isMatched: true,
    createdAt: 1692489600,
    updatedAt: 1692489600,
  },
];

export async function handleGetRequest(
  req: NextApiRequest,
  // ToDo: implement the logic to get the job data from the database (20240924 - Shirley)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  res: NextApiResponse<IResponseData<Job | null>>
) {
  const { jobId } = req.query;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: Job | null = null;

  const job = jobs.find((g) => g.id === parseInt(jobId as string, 10));
  if (job) {
    statusMessage = STATUS_MESSAGE.SUCCESS;
    payload = job;
  } else {
    // ToDo: check error message (20240924 - Shirley)
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: Job | null }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<Job | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: Job | null = null;

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
    const { httpCode, result } = formatApiResponse<Job | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
