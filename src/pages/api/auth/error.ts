import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { error } = req.query;
    // eslint-disable-next-line no-console
    console.error('Authentication error:', error);
    return res.status(500).json({ message: `Authentication Error: ${error}` });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in /api/auth/error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
