import type { NextApiRequest, NextApiResponse } from 'next';
import { IStatus } from '@/interfaces/project';
import { IResponseData } from '@/interfaces/response_data';

const responseDataArray: IStatus[] = [
  {
    status: 'Designing',
    names: ['Project 1', 'Project 2', 'Project 3'],
  },
  {
    status: 'Beta Testing',
    names: ['Project 4', 'Project 5'],
  },
  {
    status: 'Developing',
    names: ['Project 6', 'Project 7', 'Project 8'],
  },
  {
    status: 'Sold',
    names: ['Project 9'],
  },
  {
    status: 'Selling',
    names: ['Project 10', 'Project 11'],
  },
  {
    status: 'Archived',
    names: ['Project 12', 'Project 13', 'Project 14'],
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<IStatus>>) {
  const apiResponse: IResponseData<IStatus> = {
    powerby: 'iSunFa api 1.0.0',
    success: true,
    code: '200',
    message: 'request successful',
    payload: responseDataArray,
  };
  res.status(200).json(apiResponse);
}
