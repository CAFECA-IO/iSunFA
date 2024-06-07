import { NextApiRequest, NextApiResponse } from 'next';
import { IProject } from '@/interfaces/project';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkAdmin } from '@/lib/utils/auth_check';
import { createProject, listProject } from '@/lib/utils/repo/project.repo';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProject | IProject[]>>
) {
  try {
    const session = await checkAdmin(req, res);
    const { companyId } = session;
    if (req.method === 'GET') {
      const projectList: IProject[] = await listProject(companyId);
      const { httpCode, result } = formatApiResponse<IProject[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        projectList
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010002 - POST /project
    } else if (req.method === 'POST') {
      const { name, stage, members } = req.body;
      if (!name || !stage || !members) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const project: IProject = await createProject(companyId, name, stage, members);
      const { httpCode, result } = formatApiResponse<IProject>(STATUS_MESSAGE.CREATED, project);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IProject>(error.message, {} as IProject);
    res.status(httpCode).json(result);
  }
}
