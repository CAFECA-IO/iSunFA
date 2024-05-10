import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from 'prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser | IUser[]>>
) {
  try {
    if (req.method === 'GET') {
      // Todo: (20240419 - Jacky) add query like cursor, limit, etc.
      const userList: IUser[] = await prisma.user.findMany();
      const { httpCode, result } = formatApiResponse<IUser[]>(
        STATUS_MESSAGE.SUCCESS_LIST,
        userList
      );
      res.status(httpCode).json(result);
    } else if (req.method === 'POST') {
      // Handle POST request to create a new user
      const {
        name,
        fullName,
        email,
        phone,
        kycStatus,
        credentialId,
        publicKey,
        algorithm,
        imageId,
      } = req.body;
      const createdUser: IUser = await prisma.user.create({
        data: {
          name,
          fullName,
          email,
          phone,
          kycStatus,
          credentialId,
          publicKey,
          algorithm,
          imageId,
        },
      });

      const { httpCode, result } = formatApiResponse<IUser>(STATUS_MESSAGE.CREATED, createdUser);
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
