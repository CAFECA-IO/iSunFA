import { NextApiRequest, NextApiResponse } from 'next';
import { IWorkRate } from '@/interfaces/project';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { listWorkRate } from '@/lib/utils/repo/work_rate.repo';
import { listEmployeeProject } from '@/lib/utils/repo/employee_project.repo';
import { formatWorkRateList } from '@/lib/utils/formatter/work_rate.formatter';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { getSession } from '@/lib/utils/session';

function formatProjectIdFromQuery(projectId: unknown): number {
  let formattedProjectId: number = -1;
  if (typeof projectId === 'string') {
    formattedProjectId = Number(projectId);
  }
  return formattedProjectId;
}

function formatGetQuery(req: NextApiRequest) {
  const { projectId } = req.query;
  const formattedProjectId = formatProjectIdFromQuery(projectId);
  return { projectId: formattedProjectId };
}

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IWorkRate[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IWorkRate[] | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const { projectId } = formatGetQuery(req);
    if (projectId > 0) {
      const isAuth = await checkAuthorization(
        [AuthFunctionsKeys.admin, AuthFunctionsKeys.projectCompanyMatch],
        { userId, companyId, projectId }
      );
      if (!isAuth) {
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
      } else {
        try {
          const employeeProjectList = await listEmployeeProject(projectId);
          const employeeProjectsIdList = employeeProjectList.map(
            (employeeProject) => employeeProject.id
          );
          const listedWorkRate = await listWorkRate(employeeProjectsIdList);
          const workRateList = await formatWorkRateList(listedWorkRate);
          statusMessage = STATUS_MESSAGE.SUCCESS_GET;
          payload = workRateList;
        } catch (error) {
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
        }
      }
    } else {
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<IWorkRate[] | null>>
  ) => Promise<{ statusMessage: string; payload: IWorkRate[] | null }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IWorkRate[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IWorkRate[] | null = null;

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
  } finally {
    const { httpCode, result } = formatApiResponse<IWorkRate[] | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
