import { NextApiRequest, NextApiResponse } from 'next';
import { IProject } from '@/interfaces/project';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkUserAdmin } from '@/lib/utils/auth_check';
import { createProject, listProject } from '@/lib/utils/repo/project.repo';
import { formatProject, formatProjectList } from '@/lib/utils/formatter/project.formatter';
import { getSession } from '@/lib/utils/session';
import { generateIcon } from '@/lib/utils/generate_user_icon';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProject | IProject[] | null>>
) {
  let shouldContinue: boolean = true;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IProject | IProject[] | null = null;
  try {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    shouldContinue = await checkUserAdmin({ userId, companyId });
    if (shouldContinue) {
      switch (req.method) {
        case 'GET': {
          const listedProject = await listProject(companyId);
          const projectList = await formatProjectList(listedProject);
          statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
          payload = projectList;
          break;
        }
        case 'POST': {
          const { name, stage, memberIdList } = req.body;
          if (!name || !stage || !memberIdList) {
            shouldContinue = false;
          }
          if (shouldContinue) {
            const porjectIcon = await generateIcon(name);
            const createdProject = await createProject(
              companyId,
              name,
              stage,
              memberIdList,
              porjectIcon
            );
            const project = await formatProject(createdProject);
            statusMessage = STATUS_MESSAGE.CREATED;
            payload = project;
          }
          break;
        }
        default:
          statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
      }
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  }
  const { httpCode, result } = formatApiResponse<IProject | IProject[] | null>(
    statusMessage,
    payload
  );
  res.status(httpCode).json(result);
}
