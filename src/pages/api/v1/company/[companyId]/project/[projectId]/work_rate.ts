import { NextApiRequest, NextApiResponse } from 'next';
import { IWorkRate } from '@/interfaces/project';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkAdmin } from '@/lib/utils/auth_check';
import { getProjectById } from '@/lib/utils/repo/project.repo';
import { listEmployeeProject } from '@/lib/utils/repo/employeeProject.repo';
import { listWorkRate } from '@/lib/utils/repo/work_rate.repo';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IWorkRate | IWorkRate[]>>
) {
  try {
    // Info: (20240419 - Jacky) S010001 - GET /project
    if (req.method === 'GET') {
      const session = await checkAdmin(req, res);
      // Info: (20240607 - Jacky) check input parameter start
      const { companyId } = session;
      const { projectId } = req.query;
      if (!projectId) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const projectIdNum = Number(projectId);
      const project = await getProjectById(projectIdNum);
      if (project.companyId !== companyId) {
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }
      const employeeProjectList = await listEmployeeProject(projectIdNum);
      const employeeProjectsIdList = employeeProjectList.map(
        (employeeProject) => employeeProject.id
      );
      const workRateList = await listWorkRate(employeeProjectsIdList);
      const { httpCode, result } = formatApiResponse<IWorkRate[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        workRateList
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IWorkRate>(error.message, {} as IWorkRate);
    res.status(httpCode).json(result);
  }
}
