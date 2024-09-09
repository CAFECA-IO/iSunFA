/*
 * Info: (20240909 - Murky) This api is to demonstrate how to use Zod schema to validate data.
 * Delete this file after all the keys are implemented
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { APIName } from '@/constants/api_connection';
import { validateRequest } from '@/lib/utils/request_validator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const validatedQuery = validateRequest(APIName.ZOD_EXAMPLE, req);

  const { query, body } = validatedQuery;
  res.status(200).json({ query, body });
}
