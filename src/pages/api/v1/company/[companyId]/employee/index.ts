import type { NextApiRequest, NextApiResponse } from 'next';
import { IEasyEmployeeWithPagination, IEmployee } from '@/interfaces/employees';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, isParamNumeric, isParamString } from '@/lib/utils/common';
import { listEmployees, createEmployee } from '@/lib/utils/repo/employee.repo';
import { getSession } from '@/lib/utils/session';
import { getAdminByCompanyIdAndUserId } from '@/lib/utils/repo/admin.repo';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';

async function checkAuth(userId: number, companyId: number): Promise<boolean> {
  const admin = await getAdminByCompanyIdAndUserId(companyId, userId);
  return !!admin;
}

export function formatTargetPageFromQuery(targetPage: string | string[] | undefined) {
  let targetPageNumber = DEFAULT_PAGE_NUMBER;
  if (isParamNumeric(targetPage)) {
    targetPageNumber = parseInt(targetPage as string, 10);
  }
  return targetPageNumber;
}

export function formatPageSizeFromQuery(pageSize: string | string[] | undefined) {
  let pageSizeNumber = DEFAULT_PAGE_LIMIT;
  if (isParamNumeric(pageSize)) {
    pageSizeNumber = parseInt(pageSize as string, 10);
  }
  return pageSizeNumber;
}

export function formatSearchQueryFromQuery(searchQuery: string | string[] | undefined) {
  let searchQueryString: string | undefined;
  if (isParamString(searchQuery)) {
    searchQueryString = searchQuery as string;
  }
  return searchQueryString;
}

function checkInput(
  name: string,
  department: string,
  salaryPayMode: string,
  payFrequency: string,
  salary: number,
  bonus: number
): boolean {
  return !!name && !!department && !!salaryPayMode && !!payFrequency && !!salary && !!bonus;
}

// export default function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<IResponseData<IEasyEmployee[] | IEasyEmployee>>
// ) {

//     if (req.method === 'POST') {
//       const {
//         name,
//         salary,
//         departmentId,
//         bonus,
//         salaryPayMode,
//         startDate,
//         payFrequency,
//       }: IEmployee = req.body;
//       if (
//         !name ||
//         !salary ||
//         !departmentId ||
//         !startDate ||
//         !bonus ||
//         !salaryPayMode ||
//         !payFrequency
//       ) {
//         throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
//       }
//       const { httpCode, result } = formatApiResponse<IEasyEmployee>(
//         STATUS_MESSAGE.CREATED,
//         {} as IEasyEmployee
//       );
//       res.status(httpCode).json(result);
//     }
//   } catch (_error) {
//     const error = _error as Error;
//     const { httpCode, result } = formatApiResponse<IEasyEmployee>(
//       error.message,
//       {} as IEasyEmployee
//     );
//     res.status(httpCode).json(result);
//   }
// }

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IEasyEmployeeWithPagination | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IEasyEmployeeWithPagination | null = null;

  const { targetPage, pageSize, searchQuery } = req.query;
  const formattedPageSizeFromQuery = formatPageSizeFromQuery(pageSize);
  const formattedTargetPageFromQuery = formatTargetPageFromQuery(targetPage);
  const formattedSearchQueryFromQuery = formatSearchQueryFromQuery(searchQuery);
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuth(userId, companyId);
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    const employeesWithPagination = await listEmployees(
      companyId,
      formattedSearchQueryFromQuery,
      formattedPageSizeFromQuery,
      formattedTargetPageFromQuery
    );
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    payload = employeesWithPagination;
  }
  return { statusMessage, payload };
}

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IEmployee | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IEmployee | null = null;
  const { name, department, salaryPayMode, payFrequency, salary, bonus } = req.body;
  const isValid = checkInput(name, department, salaryPayMode, payFrequency, salary, bonus);
  if (!isValid) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const isAuth = await checkAuth(userId, companyId);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const newEmployee = await createEmployee(
        companyId,
        name,
        department,
        salaryPayMode,
        payFrequency,
        salary,
        bonus
      );
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = newEmployee;
    }
  }
  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: IEasyEmployeeWithPagination | IEmployee | null;
  }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IEasyEmployeeWithPagination | IEmployee | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IEasyEmployeeWithPagination | IEmployee | null = null;
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
    const { httpCode, result } = formatApiResponse<IEasyEmployeeWithPagination | IEmployee | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
