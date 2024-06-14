import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAdmin } from '@/interfaces/admin';
import { IResponseData } from '@/interfaces/response_data';
import { checkInvitation, checkUser } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { createAdminByInvitation } from '@/lib/utils/repo/transaction/create_admin_by_invitation';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin>>
) {
  try {
    if (req.method === 'PUT') {
      // Extract the necessary data from the request body
      const session = await checkUser(req, res);
      const { userId } = session;
      const { invitation } = req.body;
      if (!invitation) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const invitationinstance = await checkInvitation(invitation);
      const admin = await createAdminByInvitation(userId, invitationinstance);
      const { httpCode, result } = formatApiResponse<IAdmin>(STATUS_MESSAGE.SUCCESS, admin);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IAdmin>(error.message, {} as IAdmin);
    res.status(httpCode).json(result);
  }
}
