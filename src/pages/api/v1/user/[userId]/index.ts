import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/../prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser>>
) {
  const { method } = req;
  const { userId } = req.query;
  const userIdNum = Number(userId);
  try {
    if (!req.headers.userid) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    if (!userIdNum) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    if (method === 'GET') {
      // Handle GET request to retrieve user by userid
      const user: IUser | null = await prisma.user.findUnique({
        where: {
          id: userIdNum,
        },
      });
      if (!user) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.SUCCESS_GET, user);
      res.status(httpCode).json(result);
    } else if (method === 'PUT') {
      // Handle PUT request to update user by userid
      const user: IUser = await prisma.user.update({
        where: {
          id: userIdNum,
        },
        data: {
          name: 'Curry111',
          email: 'curry@curry.com',
        },
      });
      const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.SUCCESS_UPDATE, user);
      res.status(httpCode).json(result);
    } else if (method === 'DELETE') {
      // Handle DELETE request to delete user by userid
      const user: IUser = await prisma.user.delete({
        where: {
          id: userIdNum,
        },
      });
      const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.SUCCESS_DELETE, user);
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
