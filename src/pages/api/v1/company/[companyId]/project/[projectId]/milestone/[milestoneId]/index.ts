import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { NextApiRequest, NextApiResponse } from 'next';
import { IMilestone } from '@/interfaces/project';
import { updateProjectMilestone } from '@/lib/utils/repo/transaction/project_milestone.tx';
import { getSession } from '@/lib/utils/session';
import { getProjectById } from '@/lib/utils/repo/project.repo';
import { listProjectMilestone } from '@/lib/utils/repo/milestone.repo';
import { formatMilestoneList } from '@/lib/utils/formatter/milestone.formatter';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function checkInput(projectId: string, stage: string, startDate: string) {
  let isValid = true;
  if (!stage || !startDate || !projectId) {
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
      case 'PUT': {
        const { projectId } = req.query;
        const { stage, startDate } = req.body;
        // Info: (20240703 - Jacky) should convert to string
        shouldContinue = await checkInput(
          projectId as string,
          stage as string,
          startDate as string
        );
        // Info: (20240703 - Jacky) check authorization start
        if (shouldContinue) {
          const session = await getSession(req, res);
          const { userId, companyId } = session;
          const projectIdNum = convertStringToNumber(projectId);
          shouldContinue = await checkAuth(userId, companyId, projectIdNum);
          if (shouldContinue) {
            const startDateNum = convertStringToNumber(startDate);
            const listedMilestone = await listProjectMilestone(projectIdNum);
            const milestoneList = formatMilestoneList(listedMilestone);
            if (milestoneList.length === 0) {
              statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
            } else {
              const { updatedMilestoneList } = await updateProjectMilestone(
                projectIdNum,
                milestoneList,
                stage,
                startDateNum
              );
              statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
              payload = updatedMilestoneList;
            }
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
