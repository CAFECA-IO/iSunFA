import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkRole } from '@/lib/utils/auth_check';
import { ROLE_NAME } from '@/constants/role_name';
import { createUser, listUser } from '@/lib/utils/repo/user.repo';
import { formatUser, formatUserList } from '@/lib/utils/formatter/user.formatter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser | IUser[]>>
) {
  try {
    // Todo: (20240419 - Jacky) add query like cursor, limit, etc.
    await checkRole(req, res, ROLE_NAME.SUPER_ADMIN);
    if (req.method === 'GET') {
      const listedUser = await listUser();
      const userList: IUser[] = await formatUserList(listedUser);
      const { httpCode, result } = formatApiResponse<IUser[]>(
        STATUS_MESSAGE.SUCCESS_LIST,
        userList
      );
      res.status(httpCode).json(result);
    } else if (req.method === 'POST') {
      // Handle POST request to create a new user
      const { name, fullName, email, phone, credentialId, publicKey, algorithm, imageId } =
        req.body;
      if (!name || !credentialId || !publicKey || !algorithm) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const createdUser = await createUser(
        name,
        credentialId,
        publicKey,
        algorithm,
        imageId,
        fullName,
        email,
        phone
      );
      const user = await formatUser(createdUser);
      const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.CREATED, user);
      res.status(httpCode).json(result);
    } else {
      // Handle unsupported HTTP methods
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    // Handle errors
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUser>(error.message, {} as IUser);
    res.status(httpCode).json(result);
  }
}
