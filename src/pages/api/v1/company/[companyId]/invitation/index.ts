import prisma from '@/client';
import { ErrorMessage, SuccessMessage } from '@/constants/status_code';
import { ONE_DAY_IN_MS } from '@/constants/time';
import { ICompany } from '@/interfaces/company';
import { IInvitation } from '@/interfaces/invitation';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import MailService from '@/lib/utils/mail_service';
import { NextApiRequest, NextApiResponse } from 'next';
import { SendMailOptions } from 'nodemailer';

function generateCode() {
  // Implement your logic to generate a unique invitation code here
  // You can use any algorithm or library of your choice
  // For example, you can generate a random alphanumeric code
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const codeLength = 8;
  let invitationCode = '';
  for (let i = 0; i < codeLength; i += 1) {
    invitationCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return invitationCode;
}

async function createInvitation(
  roleIdNum: number,
  companyIdNum: number,
  code: string
): Promise<IInvitation> {
  const invitation: IInvitation = await prisma.invitation.create({
    data: {
      role: {
        connect: {
          id: roleIdNum,
        },
      },
      company: {
        connect: {
          id: companyIdNum,
        },
      },
      code,
      hasUsed: false,
      expiredAt: timestampInSeconds(Date.now() + ONE_DAY_IN_MS),
    },
  });
  return invitation;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvitation | IInvitation[]>>
) {
  try {
    if (req.method === 'POST') {
      // Extract the necessary data from the request body
      const { roleId, emails } = req.body;
      const { companyId } = req.query;
      const { userid } = req.headers;

      const userIdNum = Number(userid);
      const companyIdNum = Number(companyId);
      const roleIdNum = Number(roleId);
      // Perform any necessary validation on the data
      const user: IUser = (await prisma.user.findUnique({
        where: {
          id: userIdNum,
        },
      })) as IUser;
      if (!user) {
        throw new Error(ErrorMessage.RESOURCE_NOT_FOUND);
      }
      const company: ICompany = (await prisma.company.findUnique({
        where: {
          id: companyIdNum,
        },
      })) as ICompany;
      if (!company) {
        throw new Error(ErrorMessage.RESOURCE_NOT_FOUND);
      }
      // Make sure the user has the necessary permissions to create an invitation code
      // For example, you can check if the user is an admin of the company
      // If the user does not have the necessary permissions, return a 403 Forbidden response
      if (!emails) {
        throw new Error(ErrorMessage.INVALID_INPUT_PARAMETER);
      }
      const errors: string[] = [];
      const InvitationPromises: Promise<IInvitation>[] = [];
      const sendMailPromises: Promise<boolean>[] = [];
      //
      for (let i = 0; i < emails.length; i += 1) {
        const code = generateCode();
        const promise = createInvitation(roleIdNum, companyIdNum, code);
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
        throw new Error(ErrorMessage.INTERNAL_SERVICE_ERROR);
      }
      const { httpCode, result } = formatApiResponse<IInvitation[]>(
        SuccessMessage.CREATED,
        invitations
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(ErrorMessage.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IInvitation>(error.message, {} as IInvitation);
    res.status(httpCode).json(result);
  }
}
