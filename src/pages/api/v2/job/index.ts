import { STATUS_MESSAGE } from '@/constants/status_code';
import { IPaginatedData } from '@/interfaces/pagination';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const jobSchema = z.object({
  id: z.number(),
  companyName: z.string(),
  companyLogo: z.string(),
  issueType: z.string(),
  publicationDate: z.number(),
  estimatedWorkingHours: z.object({
    start: z.number(),
    end: z.number(),
  }),
  deadline: z.number(),
  hourlyWage: z.number(),
  caseDescription: z.string(),
  targetCandidates: z.string(),
  remarks: z.string(),
  applicationsCount: z.number(),
  isMatched: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Job = z.infer<typeof jobSchema>;

/**
 * Info: (20251028 - Luphia) dummy data for job listing page
 */

const jobs: Job[] = jobSchema.array().parse([
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
]);

export async function handleGetRequest(
  req: NextApiRequest,
  // ToDo: implement the logic to get the job data from the database (20240924 - Shirley)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  res: NextApiResponse<IResponseData<IPaginatedData<Job[]> | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<Job[]> | null = null;

  const {
    page = 1,
    pageSize = 10,
    sortBy = 'publicationDate',
    sortOrder = 'desc',
    startDate,
    endDate,
    searchQuery,
    isMatched,
  } = req.query;

  let filteredJobs = jobs;

  if (startDate) {
    filteredJobs = filteredJobs.filter((job) => job.publicationDate >= Number(startDate));
  }

  if (endDate) {
    filteredJobs = filteredJobs.filter((job) => job.publicationDate <= Number(endDate));
  }

  if (searchQuery) {
    filteredJobs = filteredJobs.filter(
      (job) =>
        job.companyName.includes(searchQuery as string) ||
        job.caseDescription.includes(searchQuery as string)
    );
  }

  if (isMatched !== undefined) {
    filteredJobs = filteredJobs.filter((job) => job.isMatched === (isMatched === 'true'));
  }

  filteredJobs = filteredJobs.sort((a, b) => {
    if (sortOrder === 'asc') {
      return a[sortBy as keyof Job] > b[sortBy as keyof Job] ? 1 : -1;
    } else {
      return a[sortBy as keyof Job] < b[sortBy as keyof Job] ? 1 : -1;
    }
  });

  const totalCount = filteredJobs.length;
  const totalPages = Math.ceil(totalCount / Number(pageSize));
  const currentPage = Number(page);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * Number(pageSize),
    currentPage * Number(pageSize)
  );

  payload = {
    data: paginatedJobs,
    page: currentPage,
    totalPages,
    totalCount,
    pageSize: Number(pageSize),
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    sort: [{ sortBy: sortBy as string, sortOrder: sortOrder as string }],
  };
  statusMessage = STATUS_MESSAGE.SUCCESS;

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IPaginatedData<Job[]> | null }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaginatedData<Job[]> | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<Job[]> | null = null;

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
    const { httpCode, result } = formatApiResponse<IPaginatedData<Job[]> | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
