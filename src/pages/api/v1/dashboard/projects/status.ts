import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  status: string;
  names: string[];
};

const responseDataArray: ResponseData[] = [
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

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData[]>) {
  res.status(200).json(responseDataArray);
}
