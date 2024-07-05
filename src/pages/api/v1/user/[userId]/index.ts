import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { ROLE_NAME } from '@/constants/role_name';
import { getUserById, updateUserById } from '@/lib/utils/repo/user.repo';
import { formatUser } from '@/lib/utils/formatter/user.formatter';
import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminByCompanyIdAndUserIdAndRoleName } from '@/lib/utils/repo/admin.repo';
import { getSession } from '@/lib/utils/session';

async function checkInput(
  userId: string,
  name: string,
  fullName: string,
  email: string,
  phone: string
): Promise<boolean> {
  const isValid = !!userId && !!name && !!fullName && !!email && !!phone;
  return isValid;
}

async function checkAuth(userId: number, companyId: number): Promise<boolean> {
  const roleName = ROLE_NAME.SUPER_ADMIN;
  const admin = await getAdminByCompanyIdAndUserIdAndRoleName(userId, companyId, roleName);
  return !!admin;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUser | null = null;
  try {
    switch (req.method) {
      case 'GET': {
        const session = await getSession(req, res);
        const { userId, companyId } = session;
        const isAuth = await checkAuth(userId, companyId);
        if (!isAuth) {
          statusMessage = STATUS_MESSAGE.FORBIDDEN;
        } else {
          const getUser = await getUserById(userId);
          if (!getUser) {
            statusMessage = STATUS_MESSAGE.SUCCESS_GET;
          } else {
            const user = await formatUser(getUser);
            statusMessage = STATUS_MESSAGE.SUCCESS_GET;
            payload = user;
          }
        }
        break;
      }
      case 'PUT': {
        const queryUserId = req.query.userId as string;
        const { name, fullName, email, phone, imageId } = req.body;
        const isValid = await checkInput(queryUserId, name, fullName, email, phone);
        if (!isValid) {
          statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
        } else {
          const session = await getSession(req, res);
          const { userId, companyId } = session;
          const isAuth = await checkAuth(userId, companyId);
          if (!isAuth) {
            statusMessage = STATUS_MESSAGE.FORBIDDEN;
          } else {
            const userIdNum = convertStringToNumber(queryUserId);
            const getUser = await getUserById(userIdNum);
            if (!getUser) {
              statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
            } else {
              const updatedUser = await updateUserById(
                userIdNum,
                name,
                fullName,
                email,
                phone,
                imageId
              );
              const user = await formatUser(updatedUser);
              statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
              payload = user;
            }
          }
        }
        break;
      }
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        break;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  }
  const { httpCode, result } = formatApiResponse<IUser | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
