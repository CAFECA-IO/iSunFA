import prisma from '@/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { EmployeeDepartments } from '@/interfaces/employees';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<EmployeeDepartments>>
) {
  try {
    if (req.method === 'GET') {
      const rawDepartments = await prisma.department.findMany({
        select: {
          name: true,
        },
      });
      const departmentsList: EmployeeDepartments = rawDepartments.map(
        (department) => department.name
      );
      const { httpCode, result } = formatApiResponse<EmployeeDepartments>(
        STATUS_MESSAGE.SUCCESS_GET,
        departmentsList
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<EmployeeDepartments>(
      error.message,
      {} as EmployeeDepartments
    );
    res.status(httpCode).json(result);
  }
}
