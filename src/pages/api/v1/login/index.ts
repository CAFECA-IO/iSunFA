import type { NextApiRequest, NextApiResponse } from 'next';
import type { ResponseData } from '../../../../type/iresponsedata';
import version from '../../../../lib/version';

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
    const statusCode = getStatusCode(error);
    res.status(statusCode).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.toString(), // Convert error to string
    });
  }
}
