import { STATUS_MESSAGE } from '@/constants/status_code';
import { IProject } from '@/interfaces/project';
import { IResponseData } from '@/interfaces/response_data';
import { isUserAdmin } from '@/lib/utils/auth_check';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { formatProject } from '@/lib/utils/formatter/project.formatter';
import { getProjectById, updateProjectById } from '@/lib/utils/repo/project.repo';
import { updateProjectMembers } from '@/lib/utils/repo/transaction/project_members.tx';
import { updateProjectMilestone } from '@/lib/utils/repo/transaction/project_milestone.tx';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';

async function checkInput(
  method: string,
  projectId: string,
  name?: string,
  stage?: string,
  memberIdList?: number[],
  imageId?: string
) {
  let isValid = true;
  switch (method) {
    case 'GET':
      if (!projectId) {
        isValid = false;
      }
      break;
    case 'PUT':
      if (!projectId || (!name && !stage && !memberIdList && !imageId)) {
        isValid = false;
      }
      break;
    default:
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
  res: NextApiResponse<IResponseData<IProject | null>>
) {
  let shouldContinue = true;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IProject | null = null;

  try {
    switch (req.method) {
      case 'GET': {
        const { projectId } = req.query;
        shouldContinue = await checkInput('GET', projectId as string);
        if (!shouldContinue) {
          statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
        } else {
          const projectIdNum = convertStringToNumber(projectId as string);
          const session = await getSession(req, res);
          const { userId, companyId } = session;
          shouldContinue = await checkAuth(userId, companyId, projectIdNum);
          if (!shouldContinue) {
            statusMessage = STATUS_MESSAGE.FORBIDDEN;
          } else {
            const project = await getProjectById(projectIdNum);
            payload = project ? await formatProject(project) : null;
            statusMessage = STATUS_MESSAGE.SUCCESS_GET;
          }
        }
        break;
      }
      case 'PUT': {
        const { projectId } = req.query;
        const { name, stage, memberIdList, imageId } = req.body;
        shouldContinue = await checkInput(
          'PUT',
          projectId as string,
          name,
          stage,
          memberIdList,
          imageId
        );
        if (!shouldContinue) {
          statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
        } else {
          const session = await getSession(req, res);
          const { userId, companyId } = session;
          const projectIdNum = convertStringToNumber(projectId as string);
          shouldContinue = await checkAuth(userId, companyId, projectIdNum);
          if (shouldContinue) {
            if (stage) {
              await updateProjectMilestone(projectIdNum, stage);
            }
            if (memberIdList) {
              await updateProjectMembers(projectIdNum, memberIdList);
            }
            const updatedProject = await updateProjectById(projectIdNum, name, imageId);
            payload = await formatProject(updatedProject);
            statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
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
    payload = null;
  }
  const { httpCode, result } = formatApiResponse<IProject | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
