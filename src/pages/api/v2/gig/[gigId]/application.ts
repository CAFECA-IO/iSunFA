import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const applications = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { gigId } = req.query;

  if (req.method === 'POST') {
    const bodySchema = z.object({
      content: z.string(),
    });

    const result = bodySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        powerby: 'iSunFA v2.0.0+1',
        success: false,
        code: '400',
        message: 'Invalid input',
        payload: {},
      });
      return;
    }

    const newApplication = {
      id: applications.length + 1,
      bookkeeperId: 1000, // Mock bookkeeper ID
      gigId: parseInt(gigId as string, 10),
      content: result.data.content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    applications.push(newApplication);

    res.status(200).json({
      powerby: 'iSunFA v2.0.0+1',
      success: true,
      code: '200',
      message: 'Application created successfully',
      payload: newApplication,
    });
  } else {
    res.status(405).json({
      powerby: 'iSunFA v2.0.0+1',
      success: false,
      code: '405',
      message: 'Method not allowed',
      payload: {},
    });
  }
}
