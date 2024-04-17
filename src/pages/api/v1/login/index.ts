import type { NextApiRequest, NextApiResponse } from 'next';
import type { ResponseData } from '../../../../type/iresponsedata';

function getStatusCode(error: Error): number {
  if (error.message === 'Method Not Allowed') {
    return 405;
  } else {
    return 500;
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    if (req.method !== 'POST') {
      throw new Error('Method Not Allowed');
    }

    const { credentialId } = req.body;

    if (credentialId === 'sameId') {
      const user = {
        name: 'John Doe',
        credentialId: 'smaJ6Wwf0q_meZiHrFolfg',
        userImage: 'https://www.example.com/image.jpg',
      };
      res.status(200).json({
        powerby: 'ISunFa api 1.0.0',
        success: true,
        code: '200',
        payload: user,
        message: 'Login sucessfully',
      });
      return;
    }

    // Perform the necessary operations here, such as creating a user
    const user = {
      name: 'John second Doe',
      credentialId: 'smaJ6Wwf0q_meZiHrFolfg',
      userImage: 'https://www.example.com/image.jpg',
    };
    res.status(200).json({
      powerby: 'ISunFa api 1.0.0',
      success: true,
      code: '200',
      payload: user,
      message: 'Login sucessfully',
    });
  } catch (_error) {
    const error = _error as Error;
    const statusCode = getStatusCode(error);
    res.status(statusCode).json({
      powerby: 'ISunFa api 1.0.0',
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.toString(), // Convert error to string
    });
  }
}
