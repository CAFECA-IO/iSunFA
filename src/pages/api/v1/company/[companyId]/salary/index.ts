import type { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { ISalary } from '@/interfaces/salary';
import { IResponseData } from '@/interfaces/response_data';

const responseDataArray: ISalary[] = [
  {
    department: 'Tech Dev',
    names_ids: [
      { name: 'John Doe', id: 1 },
      { name: 'Andy', id: 2 },
      { name: 'Eva', id: 3 },
    ],
  },
  {
    department: 'Product Design',
    names_ids: [
      { name: 'Jane Smith', id: 4 },
      { name: 'Paul', id: 5 },
    ],
  },
  {
    department: 'Marketing',
    names_ids: [
      { name: 'Bob Brown', id: 6 },
      { name: 'Johnny', id: 7 },
      { name: 'Queen', id: 8 },
      { name: 'Lion', id: 9 },
    ],
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<ISalary>>) {
  if (req.method === 'GET') {
    const apiResponse: IResponseData<ISalary> = {
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'request successful',
      payload: responseDataArray,
    };
    res.status(200).json(apiResponse);
  }
}
