import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { checkAdmin, checkProjectCompanyMatch } from '@/lib/utils/auth_check';
import { NextApiRequest, NextApiResponse } from 'next';
import { IMilestone } from '@/interfaces/project';
import { updateProjectMilestone } from '@/lib/utils/repo/transaction/project_milestone.tx';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IMilestone[]>>
) {
  try {
    if (req.method === 'PUT') {
      const { projectId, stage, startDate } = req.query;
      if (!projectId || !stage || !startDate) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      if (typeof stage !== 'string') {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const projectIdNum = convertStringToNumber(projectId);
      const startDateNum = convertStringToNumber(startDate);
      const session = await checkAdmin(req, res);
      const { companyId } = session;
      const checkedProject = await checkProjectCompanyMatch(projectIdNum, companyId);
      const { updatedMilestoneList } = await updateProjectMilestone(
        checkedProject.id,
        stage,
        startDateNum
      );
      const { httpCode, result } = formatApiResponse<IMilestone[]>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        updatedMilestoneList
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IMilestone[]>(error.message, {} as IMilestone[]);
    res.status(httpCode).json(result);
  }
}
