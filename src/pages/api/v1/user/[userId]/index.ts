import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<IUser>>) {
  const { method } = req;
  const { userId } = req.query;
  try {
    if (!req.headers.userId) {
      throw new Error('RESOURCE_NOT_FOUND');
    }
    if (!userId) {
      throw new Error('INVALID_INPUT_PARAMETER');
    }
    if (userId !== '1') {
      throw new Error('RESOURCE_NOT_FOUND');
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
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        payload: user,
        message: 'Get User sucessfully',
      });
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
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        payload: user,
        message: 'Update User sucessfully',
      });
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
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        payload: user,
        message: 'Delete User sucessfully',
      });
    } else {
      throw new Error('METHOD_NOT_ALLOWED');
    }
  } catch (_error) {
    // Handle errors
    const error = _error as Error;
    res.status(500).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: '500',
      message: error.message,
      payload: {},
    });
  }
}
