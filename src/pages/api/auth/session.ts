import { getSession } from 'next-auth/react';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    if (!session) {
      // eslint-disable-next-line no-console
      console.error('No session found');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(200).json(session);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching session:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
