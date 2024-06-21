import { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { checkAdmin, checkProjectCompanyMatch } from '@/lib/utils/auth_check';
import { IProject } from '@/interfaces/project';
import { formatProject } from '@/lib/utils/formatter/project.formatter';
import { updateProjectById } from '@/lib/utils/repo/project.repo';
import { updateProjectMembers } from '@/lib/utils/repo/transaction/project_members.tx';
import { updateProjectMilestone } from '@/lib/utils/repo/transaction/project_milestone.tx';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProject>>
) {
  try {
    const session = await checkAdmin(req, res);
    // Info: (20240607 - Jacky) check input parameter start
    const { companyId } = session;
    const { projectId } = req.query;
    if (!projectId) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    const projectIdNum = convertStringToNumber(projectId);
    // Info: (20240419 - Jacky) S010001 - GET /project
    if (req.method === 'GET') {
      const checkedProject = await checkProjectCompanyMatch(projectIdNum, companyId);
      const project = await formatProject(checkedProject);
      // Info: (20240607 - Jacky) check input parameter end
      const { httpCode, result } = formatApiResponse<IProject>(STATUS_MESSAGE.SUCCESS_GET, project);
      res.status(httpCode).json(result);
    } else if (req.method === 'PUT') {
      const { name, stage, memberIdList, imageId } = req.body;
      if (!name && !stage && !memberIdList) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const checkedProject = await checkProjectCompanyMatch(projectIdNum, companyId);
      // Info: (20240419 - Jacky) S010002 - POST /project
      if (stage) {
        await updateProjectMilestone(checkedProject.id, stage);
      }
      if (memberIdList) {
        await updateProjectMembers(checkedProject.id, memberIdList);
      }
      const updatedProject = await updateProjectById(checkedProject.id, name, imageId);
      const project = await formatProject(updatedProject);
      const { httpCode, result } = formatApiResponse<IProject>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        project
      );
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
