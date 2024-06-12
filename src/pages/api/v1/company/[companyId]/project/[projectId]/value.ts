import { NextApiRequest, NextApiResponse } from 'next';
import { IValue } from '@/interfaces/project';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkAdmin, checkProjectCompanyMatch } from '@/lib/utils/auth_check';
import { listProjectValue } from '@/lib/utils/repo/value.repo';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IValue | IValue[]>>
) {
  try {
    if (req.method === 'GET') {
      const session = await checkAdmin(req, res);
      // Info: (20240607 - Jacky) check input parameter start
      const { companyId } = session;
      const { projectId } = req.query;
      if (!projectId) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const projectIdNum = Number(projectId);
      const project = await checkProjectCompanyMatch(projectIdNum, companyId);
      // Info: (20240607 - Jacky) check input parameter end
      const valueList: IValue[] = await listProjectValue(project.id);
      const { httpCode, result } = formatApiResponse<IValue[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        valueList
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IValue>(error.message, {} as IValue);
    res.status(httpCode).json(result);
  }
}
