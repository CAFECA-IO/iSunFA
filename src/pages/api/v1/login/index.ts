import type { NextApiRequest, NextApiResponse } from 'next';
import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import { IUser } from '@/interfaces/user';
import { IResponseData } from '../../../../interfaces/response_data';
import version from '../../../../lib/version';

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<IUser>>) {
  try {
    // Info: (20240419 - Jacky) L010001 - POST /login
    if (req.method !== 'POST') {
      throw new Error('Method Not Allowed');
    }

    const { credentialId } = req.body;

    if (credentialId === 'sameId') {
      const user = {
        id: '1',
        name: 'John Doe',
        credentialId: 'smaJ6Wwf0q_meZiHrFolfg',
        userImage: 'https://www.example.com/image.jpg',
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        payload: user,
        message: 'Login sucessfully',
      });
      return;
    }

    // Perform the necessary operations here, such as creating a user
    const user = {
      id: '2',
      name: 'John second Doe',
      credentialId: 'smaJ6Wwf0q_meZiHrFolfg',
      userImage: 'https://www.example.com/image.jpg',
    };
    res.status(200).json({
      powerby: 'ISunFa api ' + version,
      success: true,
      code: '200',
      payload: user,
      message: 'Login sucessfully',
    });
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message, // Convert error to string
    });
  }
}
