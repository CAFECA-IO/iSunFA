import { NextApiRequest, NextApiResponse } from 'next';
import { IProject } from '@/interfaces/project';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, convertStringToNumber } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { getProjectById, updateProjectById } from '@/lib/utils/repo/project.repo';
import { listProjectMilestone } from '@/lib/utils/repo/milestone.repo';
import { updateProjectMilestone } from '@/lib/utils/repo/transaction/project_milestone.tx';
import { updateProjectMembers } from '@/lib/utils/repo/transaction/project_members.tx';
import { formatMilestoneList } from '@/lib/utils/formatter/milestone.formatter';
import { formatProject } from '@/lib/utils/formatter/project.formatter';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { getSession } from '@/lib/utils/session';

async function handleGetRequest(req: NextApiRequest, res: NextApiResponse<IResponseData<IProject | null>>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IProject | null = null;

  const { projectId } = req.query;
  const projectIdNum = convertStringToNumber(projectId as string);
  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization(
      [AuthFunctionsKeys.admin, AuthFunctionsKeys.projectCompanyMatch],
      { userId, companyId, projectId: projectIdNum }
    );
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const project = await getProjectById(projectIdNum);
      payload = project ? formatProject(project) : null;
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    }
  }

  return { statusMessage, payload };
}

async function handlePutRequest(req: NextApiRequest, res: NextApiResponse<IResponseData<IProject | null>>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IProject | null = null;

  const { projectId } = req.query;
  const { name, stage, memberIdList, imageId } = req.body;
  const projectIdNum = convertStringToNumber(projectId as string);
  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization(
      [AuthFunctionsKeys.admin, AuthFunctionsKeys.projectCompanyMatch],
      { userId, companyId, projectId: projectIdNum }
    );
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      if (stage) {
        const listedMilestone = await listProjectMilestone(projectIdNum);
        if (listedMilestone.length === 0) {
          statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
        } else {
          const milestoneList = formatMilestoneList(listedMilestone);
          await updateProjectMilestone(projectIdNum, milestoneList, stage);
        }
      }
      if (memberIdList) {
        await updateProjectMembers(projectIdNum, memberIdList);
      }
      const updatedProject = await updateProjectById(projectIdNum, name, imageId);
      payload = formatProject(updatedProject);
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<IProject | null>>
  ) => Promise<{ statusMessage: string; payload: IProject | null }>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProject | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IProject | null = null;

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
    const { httpCode, result } = formatApiResponse<IProject | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
