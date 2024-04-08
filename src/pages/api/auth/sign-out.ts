import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Info: Clear the FIDO2 cookie (20240408 - Shirley)
  res.setHeader('Set-Cookie', 'FIDO2=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');

  res.status(200).json({ message: 'Successfully signed out' });
}
