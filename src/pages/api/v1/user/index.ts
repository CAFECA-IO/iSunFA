import { STATUS_CODE } from '@/constants/status_code';
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
      const { httpCode, result } = formatApiResponse<IUser[]>(STATUS_CODE.SUCCESS_LIST, userList);
      res.status(httpCode).json(result);
    } else if (req.method === 'POST') {
      // Handle POST request to create a new user
      const { name } = req.body;
      const newUser: IUser = {
        id: 3,
        name,
        fullName: 'John Doe',
        email: 'john@mermer.cc',
        phone: '12345678',
        kycStatus: true,
        credentialId: '1',
        publicKey: 'public-key',
        algorithm: 'ES256',
      };
      const createdUser: IUser = await prisma.user.create({
        data: {
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          kycStatus: newUser.kycStatus,
          credentialId: newUser.credentialId,
          publicKey: newUser.publicKey,
          algorithm: newUser.algorithm,
        },
      });

      const { httpCode, result } = formatApiResponse<IUser>(STATUS_CODE.CREATED, createdUser);
      res.status(httpCode).json(result);
    } else {
      // Handle unsupported HTTP methods
      throw new Error(STATUS_CODE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    // Handle errors
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUser>(error.message, {} as IUser);
    res.status(httpCode).json(result);
  }
}
