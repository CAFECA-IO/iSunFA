import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { checkUser } from '@/lib/utils/auth_check';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser>>
) {
  try {
    const session = await checkUser(req, res);
    const { userId } = session;
    const admin = await prisma.admin.findMany({
      where: {
        userId,
      },
      select: {
        role: true,
      },
    });
    const roleNames: string[] = admin.map((item) => item.role.name);
    if (!roleNames.includes('SUPER_ADMIN')) {
      throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
    }
    const userIdNum = Number(req.query.userId);
    if (Number.isNaN(userIdNum)) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    if (req.method === 'GET') {
      // Handle GET request to retrieve user by userid
      const user: IUser = (await prisma.user.findUnique({
        where: {
          id: userIdNum,
        },
      })) as IUser;
      if (!user) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.SUCCESS_GET, user);
      res.status(httpCode).json(result);
    } else if (req.method === 'PUT') {
      // Handle PUT request to update user by userid
      const { name, fullName, email, phone, imageId } = req.body;
      const user: IUser = await prisma.user.update({
        where: {
          id: userIdNum,
        },
        data: {
          name,
          email,
          fullName,
          phone,
          imageId,
        },
      });
      const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.SUCCESS_UPDATE, user);
      res.status(httpCode).json(result);
    } else if (req.method === 'DELETE') {
      // Handle DELETE request to delete user by userid
      await prisma.admin.deleteMany({
        where: {
          userId: userIdNum,
        },
      });
      const user = await prisma.user.delete({
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
