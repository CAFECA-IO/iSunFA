import { ROLE_NAME } from '@/constants/role_name';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IInvitation } from '@/interfaces/invitation';
import { IResponseData } from '@/interfaces/response_data';
import { checkRole } from '@/lib/utils/auth_check';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import MailService from '@/lib/utils/mail_service';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { createInvitation } from '@/lib/utils/repo/invitation.repo';
import { NextApiRequest, NextApiResponse } from 'next';
import { SendMailOptions } from 'nodemailer';

function generateCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const codeLength = 8;
  let invitationCode = '';
  for (let i = 0; i < codeLength; i += 1) {
    invitationCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return invitationCode;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvitation | IInvitation[]>>
) {
  try {
    if (req.method === 'POST') {
      const session = await checkRole(req, res, ROLE_NAME.OWNER);
      const { roleId, emails } = req.body;
      const { userId, companyId } = session;
      const roleIdNum = await convertStringToNumber(roleId);
      const company = await getCompanyById(companyId);
      if (!emails) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const errors: string[] = [];
      const InvitationPromises: Promise<IInvitation>[] = [];
      const sendMailPromises: Promise<boolean>[] = [];
      //
      for (let i = 0; i < emails.length; i += 1) {
        const code = generateCode();
        const promise = createInvitation(roleIdNum, companyId, userId, code, emails[i]);
        InvitationPromises.push(promise);
      }
      const invitations = await Promise.all(InvitationPromises);
      for (let i = 0; i < emails.length; i += 1) {
        const email = emails[i];
        const mailOptions: SendMailOptions = {
          from: process.env.GOOGLE_CLIENT_ID,
          to: email,
          subject: 'Invitation to join the company',
          text: `You have been invited to join the company ${company.name}. Your invitation code is ${invitations[i].code}`,
        };
        try {
          const mailServiceInstance = MailService.getInstance();
          const promise = mailServiceInstance.sendMail(mailOptions);
          sendMailPromises.push(promise);
        } catch (_error) {
          const error = _error as Error;
          errors.push(error.message);
        }
      }
      if (errors.length > 0) {
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
      }
      const { httpCode, result } = formatApiResponse<IInvitation[]>(
        STATUS_MESSAGE.CREATED,
        invitations
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IInvitation>(error.message, {} as IInvitation);
    res.status(httpCode).json(result);
  }
}
