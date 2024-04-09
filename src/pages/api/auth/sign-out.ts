import { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME } from '../../../constants/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookieName = COOKIE_NAME.FIDO2;
  const target = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  // Info: Clear the FIDO2 cookie (20240408 - Shirley)
  res.setHeader('Set-Cookie', target);

  res.status(200).json({ message: 'Successfully signed out' });
}
