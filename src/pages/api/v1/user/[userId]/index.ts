import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkRole } from '@/lib/utils/auth_check';
import { ROLE_NAME } from '@/constants/role_name';
import { getUserById, updateUserById } from '@/lib/utils/repo/user.repo';
import { formatUser } from '@/lib/utils/formatter/user.formatter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser>>
) {
  try {
    await checkRole(req, res, ROLE_NAME.SUPER_ADMIN);
    if (!req.query.userId) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    const userIdNum = Number(req.query.userId);
    if (Number.isNaN(userIdNum)) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    if (req.method === 'GET') {
      // Handle GET request to retrieve user by userid
      const getUser = await getUserById(userIdNum);
      const user = await formatUser(getUser);
      const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.SUCCESS_GET, user);
      res.status(httpCode).json(result);
    } else if (req.method === 'PUT') {
      // Handle PUT request to update user by userid
      const { name, fullName, email, phone, imageId } = req.body;
      const updatedUser = await updateUserById(userIdNum, name, fullName, email, phone, imageId);
      const user = await formatUser(updatedUser);
      const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.SUCCESS_UPDATE, user);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    // Handle errors
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUser>(error.message, {} as IUser);
    res.status(httpCode).json(result);
  }
}
