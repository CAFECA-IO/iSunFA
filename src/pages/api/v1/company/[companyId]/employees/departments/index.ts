import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { EmployeeDepartments } from '@/interfaces/employees';
import { IResponseData } from '@/interfaces/response_data';

const responseDataArray: EmployeeDepartments = [
  'Marketing',
  'Accounting',
  'Human Resource',
  'UI/UX',
  'PM',
  'Develop',
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<EmployeeDepartments>>
) {
  if (req.method === 'GET') {
    const apiResponse: IResponseData<EmployeeDepartments> = {
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'request successful',
      payload: responseDataArray,
    };
    res.status(200).json(apiResponse);
  } else {
    const apiResponse: IResponseData<EmployeeDepartments> = {
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'bad request',
      payload: null,
    };
    res.status(400).json(apiResponse);
  }
}
