import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { IInvitation } from '@/interfaces/invitation';
import { IResponseData } from '@/interfaces/response_data';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { formatInvitationList } from '@/lib/utils/formatter/invitation.formatter';
import MailService from '@/lib/utils/mail_service';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { createInvitation } from '@/lib/utils/repo/invitation.repo';
import { getSession } from '@/lib/utils/session';
import { Invitation } from '@prisma/client';
import { SendMailOptions } from 'nodemailer';

function checkInput(emails: string[], roleId: number): boolean {
  return !!emails && !!roleId;
}

function generateCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const codeLength = 8;
  let invitationCode = '';
  for (let i = 0; i < codeLength; i += 1) {
    invitationCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return invitationCode;
}

async function sendMail(
  emails: string[],
  invitations: IInvitation[],
  companyName: string
): Promise<void> {
  const errors: string[] = [];
  const sendMailPromises: Promise<boolean>[] = [];
  for (let i = 0; i < emails.length; i += 1) {
    const email = emails[i];
    const mailOptions: SendMailOptions = {
      from: process.env.MAIL_CLIENT_ID,
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
  await Promise.all(sendMailPromises);
}

async function processInvitations(
  roleIdNum: number,
  companyId: number,
  userId: number,
  emails: string[]
): Promise<IInvitation[]> {
  const InvitationPromises: Promise<Invitation>[] = [];
  for (let i = 0; i < emails.length; i += 1) {
    const code = generateCode();
    const promise = createInvitation(roleIdNum, companyId, userId, code, emails[i]);
    InvitationPromises.push(promise);
  }
  const listedInvitations = await Promise.all(InvitationPromises);
  const formattedInvitationList = formatInvitationList(listedInvitations);
  return formattedInvitationList;
}

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvitation[]>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IInvitation[] = [];

  const { roleId, emails } = req.body;
  const isValidInput = checkInput(emails, roleId);
  if (!isValidInput) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const isAuth = await checkAuthorization([AuthFunctionsKeys.owner], { userId, companyId });

    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      try {
        const roleIdNum = convertStringToNumber(roleId);
        const company = await getCompanyById(companyId);
        const invitationList = await processInvitations(roleIdNum, companyId, userId, emails);
        statusMessage = STATUS_MESSAGE.CREATED;
        payload = invitationList;
        await sendMail(emails, invitationList, company!.name);
      } catch (error) {
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<IInvitation[]>>
  ) => Promise<{ statusMessage: string; payload: IInvitation[] }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvitation[]>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IInvitation[] = [];

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IInvitation[]>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
