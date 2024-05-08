import { STATUS_CODE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser | IUser[]>>
) {
  try {
    if (req.method === 'GET') {
      // Handle GET request to list all users
      const users: IUser[] = [
        {
          id: '1',
          name: 'John',
          fullName: 'John Doe',
          email: 'john@mermer.cc',
          phone: '12345678',
          kycStatus: 'verified',
          credentialId: '1',
          publicKey: 'public-key',
          algorithm: 'ES256',
        },
        {
          id: '2',
          name: 'Jane',
          credentialId: '2',
          publicKey: 'public-key',
          algorithm: 'ES256',
        },
      ];
      const { httpCode, result } = formatApiResponse<IUser[]>(STATUS_CODE.SUCCESS_LIST, users);
      res.status(httpCode).json(result);
    } else if (req.method === 'POST') {
      // Handle POST request to create a new user
      const { name } = req.body;
      const newUser: IUser = {
        id: '3',
        name,
        fullName: 'John Doe',
        email: 'john@mermer.cc',
        phone: '12345678',
        kycStatus: 'verified',
        credentialId: '1',
        publicKey: 'public-key',
        algorithm: 'ES256',
      };
      const { httpCode, result } = formatApiResponse<IUser>(STATUS_CODE.CREATED, newUser);
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
