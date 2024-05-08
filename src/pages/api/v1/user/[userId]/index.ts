import { STATUS_CODE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<IUser>>) {
  const { method } = req;
  const { userId } = req.query;
  try {
    if (!req.headers.userId) {
      throw new Error(STATUS_CODE.RESOURCE_NOT_FOUND);
    }
    if (!userId) {
      throw new Error(STATUS_CODE.INVALID_INPUT_PARAMETER);
    }
    if (userId !== '1') {
      throw new Error(STATUS_CODE.RESOURCE_NOT_FOUND);
    }
    if (method === 'GET') {
      // Handle GET request to retrieve user by userId
      const user: IUser = {
        id: '1',
        name: 'John',
        fullName: 'John Doe',
        email: 'john@mermer.cc',
        phone: '12345678',
        kycStatus: 'verified',
        credentialId: '1',
        publicKey: 'public-key',
        algorithm: 'ES256',
      };
      const { httpCode, result } = formatApiResponse<IUser>(STATUS_CODE.SUCCESS_GET, user);
      res.status(httpCode).json(result);
    } else if (method === 'PUT') {
      // Handle PUT request to update user by userId
      const user: IUser = {
        id: userId,
        name: 'John',
        fullName: 'John Doe',
        email: 'john@mermer.cc',
        phone: '12345678',
        kycStatus: 'verified',
        credentialId: '1',
        publicKey: 'public-key',
        algorithm: 'ES256',
      };
      const { httpCode, result } = formatApiResponse<IUser>(STATUS_CODE.SUCCESS_UPDATE, user);
      res.status(httpCode).json(result);
    } else if (method === 'DELETE') {
      // Handle DELETE request to delete user by userId
      const user: IUser = {
        id: userId,
        name: 'John',
        fullName: 'John Doe',
        email: 'john@mermer.cc',
        phone: '12345678',
        kycStatus: 'verified',
        credentialId: '1',
        publicKey: 'public-key',
        algorithm: 'ES256',
      };
      const { httpCode, result } = formatApiResponse<IUser>(STATUS_CODE.SUCCESS_DELETE, user);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_CODE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    // Handle errors
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUser>(error.message, {} as IUser);
    res.status(httpCode).json(result);
  }
}
