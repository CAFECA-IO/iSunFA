import { ROLE_NAME } from '@/constants/role_name';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IInvitation } from '@/interfaces/invitation';
import { IResponseData } from '@/interfaces/response_data';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { formatInvitationList } from '@/lib/utils/formatter/invitation.formatter';
import MailService from '@/lib/utils/mail_service';
import { getAdminByCompanyIdAndUserIdAndRoleName } from '@/lib/utils/repo/admin.repo';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { createInvitation } from '@/lib/utils/repo/invitation.repo';
import { getSession } from '@/lib/utils/session';
import { Invitation } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { SendMailOptions } from 'nodemailer';

function checkInput(emails: string[], roleId: number): boolean {
  const isValid = !!emails && !!roleId;
  return isValid;
}

async function checkAuth(userId: number, companyId: number): Promise<boolean> {
  const roleName = ROLE_NAME.OWNER;
  const admin = await getAdminByCompanyIdAndUserIdAndRoleName(userId, companyId, roleName);
  return !!admin;
}

function generateCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const codeLength = 8;
  let invitationCode = '';
  for (let i = 0; i < codeLength; i += 1) {
    invitationCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return invitationCode;
}

function sendMail(emails: string[], invitations: IInvitation[], companyName: string) {
  const errors: string[] = [];
  const sendMailPromises: Promise<boolean>[] = [];
  for (let i = 0; i < emails.length; i += 1) {
    const email = emails[i];
    const mailOptions: SendMailOptions = {
      from: process.env.GOOGLE_CLIENT_ID,
      to: email,
      subject: 'Invitation to join the company',
      text: `You have been invited to join the company ${companyName}. Your invitation code is ${invitations[i].code}`,
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
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvitation[]>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IInvitation[] = [];
  try {
    switch (req.method) {
      case 'POST': {
        const { roleId, emails } = req.body;
        const isValidInput = checkInput(emails, roleId);
        if (!isValidInput) {
          statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
        } else {
          const session = await getSession(req, res);
          const { userId, companyId } = session;
          const isAuth = await checkAuth(userId, companyId);
          if (!isAuth) {
            statusMessage = STATUS_MESSAGE.FORBIDDEN;
          } else {
            const roleIdNum = convertStringToNumber(roleId);
            const company = await getCompanyById(companyId);
            const InvitationPromises: Promise<Invitation>[] = [];
            for (let i = 0; i < emails.length; i += 1) {
              const code = generateCode();
              const promise = createInvitation(roleIdNum, companyId, userId, code, emails[i]);
              InvitationPromises.push(promise);
            }
            const listedInvitations = await Promise.all(InvitationPromises);
            const invitationList = formatInvitationList(listedInvitations);
            statusMessage = STATUS_MESSAGE.CREATED;
            payload = invitationList;
            sendMail(emails, invitationList, company!.name);
          }
        }
        break;
      }
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        break;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = [];
  }
  const { httpCode, result } = formatApiResponse<IInvitation[]>(statusMessage, payload);
  res.status(httpCode).json(result);
}
