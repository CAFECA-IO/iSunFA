import { NextApiRequest, NextApiResponse } from 'next';
import { IProject } from '@/interfaces/project';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { createProject, listProject } from '@/lib/utils/repo/project.repo';
import { formatProject, formatProjectList } from '@/lib/utils/formatter/project.formatter';
import { getSession } from '@/lib/utils/session';
import { generateIcon } from '@/lib/utils/generate_user_icon';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProject[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IProject[] | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      try {
        const listedProject = await listProject(companyId);
        const projectList = await formatProjectList(listedProject);
        statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
        payload = projectList;
      } catch (error) {
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      }
    }
  }

  return { statusMessage, payload };
}

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProject | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IProject | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { name, stage, memberIdList } = req.body;
      if (!name || !stage || !memberIdList) {
        statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      } else {
        try {
          const projectIcon = await generateIcon(name);
          const createdProject = await createProject(
            companyId,
            name,
            stage,
            memberIdList,
            projectIcon
          );
          const project = formatProject(createdProject);
          statusMessage = STATUS_MESSAGE.CREATED;
          payload = project;
        } catch (error) {
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
        }
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<IProject | IProject[] | null>>
  ) => Promise<{ statusMessage: string; payload: IProject | IProject[] | null }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProject | IProject[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IProject | IProject[] | null = null;

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
    const { httpCode, result } = formatApiResponse<IProject | IProject[] | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
