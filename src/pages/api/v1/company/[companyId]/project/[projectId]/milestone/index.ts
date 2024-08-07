import { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { IMilestone } from '@/interfaces/project';
import { listProjectMilestone } from '@/lib/utils/repo/milestone.repo';
import { formatMilestoneList } from '@/lib/utils/formatter/milestone.formatter';
import { getSession } from '@/lib/utils/session';
import { getProjectById } from '@/lib/utils/repo/project.repo';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function checkInput(projectId: string) {
  let isValid = true;
  if (!projectId) {
    isValid = false;
  }
  return isValid;
}

async function checkAuth(userId: number, companyId: number, projectId: number) {
  let isValid = true;
  const isAdmin = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
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
  res: NextApiResponse<IResponseData<IMilestone[]>>
) {
  let shouldContinue = true;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IMilestone[] = [];
  try {
    switch (req.method) {
      case 'GET': {
        const { projectId } = req.query;
        shouldContinue = await checkInput(projectId as string);
        if (!shouldContinue) {
          statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
        } else {
          const session = await getSession(req, res);
          const { userId, companyId } = session;
          const projectIdNum = convertStringToNumber(projectId);

          shouldContinue = await checkAuth(userId, companyId, projectIdNum);
          if (!shouldContinue) {
            statusMessage = STATUS_MESSAGE.FORBIDDEN;
          } else {
            const listedMilestone = await listProjectMilestone(projectIdNum);
            const milestoneList = formatMilestoneList(listedMilestone);
            statusMessage = STATUS_MESSAGE.SUCCESS_GET;
            payload = milestoneList;
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
    payload = [];
  }
  const { httpCode, result } = formatApiResponse<IMilestone[]>(statusMessage, payload);
  res.status(httpCode).json(result);
}
