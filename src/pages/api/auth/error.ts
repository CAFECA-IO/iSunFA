import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { error } = req.query;
    // Todo: (20240822 - Anna) feat. Murky - 使用 logger
    return res.status(500).json({ message: `Authentication Error: ${error}` });
  } catch (error) {
    // Todo: (20240822 - Anna) feat. Murky - 使用 logger
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
