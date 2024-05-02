import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<IUser>>) {
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
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        payload: users,
        message: 'List Users sucessfully',
      });
    } else if (req.method === 'POST') {
      // Handle POST request to create a new user
      const { name } = req.body;
      const newUser: IUser = {
        id: '2',
        name,
        credentialId: '2',
        publicKey: 'public-key',
        algorithm: 'ES256',
      };
      res.status(201).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        payload: newUser,
        message: 'Create User sucessfully',
      });
    } else {
      // Handle unsupported HTTP methods
      throw new Error('Method Not Allowed');
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
