import { NextApiRequest, NextApiResponse } from 'next';
import { IWorkRate } from '@/interfaces/project';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { checkAdmin, isUserAdmin } from '@/lib/utils/auth_check';
import { listWorkRate } from '@/lib/utils/repo/work_rate.repo';
import { getProjectById } from '@/lib/utils/repo/project.repo';
import { listEmployeeProject } from '@/lib/utils/repo/employee_project.repo';
import { formatWorkRateList } from '@/lib/utils/formatter/work_rate.formatter';

async function checkInput(projectId: string) {
  let isValid = true;
  if (!projectId) {
    isValid = false;
  }
  return isValid;
}

async function checkAuth(userId: number, companyId: number, projectId: number) {
  let isValid = true;
  const isAdmin = await isUserAdmin(userId, companyId);
  if (!isAdmin) {
    isValid = false;
  } else {
    const project = await getProjectById(projectId);
    if (!project || project.companyId !== companyId) {
      isValid = false;
    }
  }
  return isValid;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IWorkRate | IWorkRate[]>>
) {
  let shouldContinue = true;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IWorkRate[] = [];

  try {
    if (req.method === 'GET') {
      const { projectId } = req.query;
      shouldContinue = await checkInput(projectId as string);
      if (!shouldContinue) {
        statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      } else {
        const session = await checkAdmin(req, res);
        const { companyId } = session;
        const projectIdNum = convertStringToNumber(projectId);

        shouldContinue = await checkAuth(session.userId, companyId, projectIdNum);
        if (!shouldContinue) {
          statusMessage = STATUS_MESSAGE.FORBIDDEN;
        } else {
          const employeeProjectList = await listEmployeeProject(projectIdNum);
          const employeeProjectsIdList = employeeProjectList.map(
            (employeeProject) => employeeProject.id
          );
          const listedWorkRate = await listWorkRate(employeeProjectsIdList);
          const workRateList = await formatWorkRateList(listedWorkRate);
          statusMessage = STATUS_MESSAGE.SUCCESS_GET;
          payload = workRateList;
        }
      }
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = [];
  }

  const { httpCode, result } = formatApiResponse<IWorkRate[]>(statusMessage, payload);
  res.status(httpCode).json(result);
}
