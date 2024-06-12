import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { IAdmin } from '@/interfaces/admin';
import { checkAdmin, checkOwner } from '@/lib/utils/auth_check';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin | IAdmin[]>>
) {
  try {
    const { adminId } = req.query;
    const adminIdNumber = Number(adminId);
    if (req.method === 'GET') {
      await checkAdmin(req, res);
      const admin: IAdmin = (await prisma.admin.findUnique({
        where: {
          id: adminIdNumber,
        },
        include: {
          user: true,
          company: true,
          role: true,
        },
      })) as IAdmin;
      if (!admin) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      const { httpCode, result } = formatApiResponse<IAdmin>(STATUS_MESSAGE.SUCCESS_GET, admin);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010003 - PUT /subscription/:id
    } else if (req.method === 'PUT') {
      const session = await checkOwner(req, res);
      const { companyId } = session;
      const { status, roleName } = req.body;
      if (!status && !roleName) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const getAdmin: IAdmin = (await prisma.admin.findUnique({
        where: {
          id: adminIdNumber,
        },
        include: {
          user: true,
          company: true,
          role: true,
        },
      })) as IAdmin;
      if (!getAdmin) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      if (getAdmin.company.id !== companyId) {
        throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
      }
      const updatedAdmin: IAdmin = (await prisma.admin.update({
        where: {
          id: adminIdNumber,
        },
        data: {
          status,
          role: {
            connect: {
              name: roleName,
            },
          },
        },
        include: {
          user: true,
          company: true,
          role: true,
        },
      })) as IAdmin;

      const { httpCode, result } = formatApiResponse<IAdmin>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        updatedAdmin
      );
      res.status(httpCode).json(result);
    } else if (req.method === 'DELETE') {
      const session = await checkOwner(req, res);
      const { companyId } = session;
      const getAdmin: IAdmin = (await prisma.admin.findUnique({
        where: {
          id: adminIdNumber,
        },
        include: {
          user: true,
          company: true,
          role: true,
        },
      })) as IAdmin;
      if (!getAdmin) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      if (getAdmin.company.id !== companyId) {
        throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
      }
      const deletedAdmin: IAdmin = (await prisma.admin.delete({
        where: {
          id: adminIdNumber,
        },
        include: {
          user: true,
          company: true,
          role: true,
        },
      })) as IAdmin;
      if (!deletedAdmin) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      const { httpCode, result } = formatApiResponse<IAdmin>(
        STATUS_MESSAGE.SUCCESS_DELETE,
        deletedAdmin
      );
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
