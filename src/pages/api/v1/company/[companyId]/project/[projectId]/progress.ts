import { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, convertStringToNumber } from '@/lib/utils/common';
import { checkAdmin, isUserAdmin } from '@/lib/utils/auth_check';
import { listProjectProgress } from '@/lib/utils/repo/progress.repo';
import { getProjectById } from '@/lib/utils/repo/project.repo';

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
  res: NextApiResponse<IResponseData<number>>
) {
  let shouldContinue = true;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number = 0;

  try {
    switch (req.method) {
      case 'GET': {
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
            const projectProgress: number = await listProjectProgress(projectIdNum);
            statusMessage = STATUS_MESSAGE.SUCCESS_GET;
            payload = projectProgress;
          }
        }
        break;
      }
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = 0;
  }

  const { httpCode, result } = formatApiResponse<number>(statusMessage, payload);
  res.status(httpCode).json(result);
}
