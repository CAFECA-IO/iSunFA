import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { IProject } from '@/interfaces/project';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { IResponseData } from '@/interfaces/response_data';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProject>>
) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  try {
    if (!req.headers.userid) {
      throw new Error('Resource not found');
    }
    // Info: (20240419 - Jacky) S010001 - GET /project
    if (req.method === 'GET') {
      const projectList: IProject[] = [
        {
          id: '1',
          name: 'Project 1',
          value: {
            totalRevenue: 1000,
            totalRevenueGrowthIn30d: 10,
            totalExpense: 500,
            netProfit: 500,
            netProfitGrowthIn30d: 10,
            netProfitGrowthInYear: 3,
          },
          completionPercent: 50,
          milestones: [
            {
              id: '1',
              status: 'Milestone 1',
              startDate: new Date().getTime() - 150 * millisecondsPerDay,
              endDate: new Date().getTime() - 100 * millisecondsPerDay,
            },
            {
              id: '2',
              status: 'Milestone 2',
              startDate: new Date().getTime() - 50 * millisecondsPerDay,
              endDate: new Date().getTime() - 100 * millisecondsPerDay,
            },
            {
              id: '3',
              status: 'Milestone 3',
              startDate: new Date().getTime() - 50 * millisecondsPerDay,
              endDate: new Date().getTime() - 5 * millisecondsPerDay,
            },
          ],
          salesData: [
            {
              date: '2024-01-01',
              totalSales: 1000,
              comparison: 10,
            },
            {
              date: '2024-02-06',
              totalSales: 1000,
              comparison: 10,
            },
          ],
          workerRate: [
            {
              id: '1',
              name: 'Worker 1',
              avatar: 'avatar1',
              involvementRate: 50,
              hours: 10,
            },
            {
              id: '2',
              name: 'Worker 2',
              avatar: 'avatar2',
              involvementRate: 50,
              hours: 10,
            },
          ],
          members: ['1', '2'],
        },
        {
          id: '2',
          name: 'Project 2',
          value: {
            totalRevenue: 1000,
            totalRevenueGrowthIn30d: 10,
            totalExpense: 500,
            netProfit: 500,
            netProfitGrowthIn30d: 10,
            netProfitGrowthInYear: 3,
          },
          completionPercent: 75,
          milestones: [
            {
              id: '1',
              status: 'Milestone 1',
              startDate: new Date().getTime() - 150 * millisecondsPerDay,
              endDate: new Date().getTime() - 100 * millisecondsPerDay,
            },
            {
              id: '2',
              status: 'Milestone 2',
              startDate: new Date().getTime() - 50 * millisecondsPerDay,
              endDate: new Date().getTime() - 100 * millisecondsPerDay,
            },
            {
              id: '3',
              status: 'Milestone 3',
              startDate: new Date().getTime() - 50 * millisecondsPerDay,
              endDate: new Date().getTime() - 5 * millisecondsPerDay,
            },
          ],
          salesData: [
            {
              date: '2024-01-01',
              totalSales: 1000,
              comparison: 10,
            },
            {
              date: '2024-02-06',
              totalSales: 1000,
              comparison: 10,
            },
          ],
          workerRate: [
            {
              id: '1',
              name: 'Worker 1',
              avatar: 'avatar1',
              involvementRate: 50,
              hours: 10,
            },
            {
              id: '3',
              name: 'Worker 2',
              avatar: 'avatar2',
              involvementRate: 50,
              hours: 10,
            },
          ],
          members: ['1', '3'],
        },
      ];
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'list all projects',
        payload: projectList,
      });
      // Info: (20240419 - Jacky) S010002 - POST /project
    } else if (req.method === 'POST') {
      const { plan, paymentId, autoRenew } = req.body;
      if (!plan || !paymentId || !autoRenew) {
        throw new Error('Invalid input parameter');
      }
      const newProject: IProject = {
        id: '3',
        name: 'Project 3',
        value: {
          totalRevenue: 1000,
          totalRevenueGrowthIn30d: 10,
          totalExpense: 500,
          netProfit: 500,
          netProfitGrowthIn30d: 10,
          netProfitGrowthInYear: 3,
        },
        completionPercent: 75,
        milestones: [
          {
            id: '1',
            status: 'Milestone 1',
            startDate: new Date().getTime() - 150 * millisecondsPerDay,
            endDate: new Date().getTime() - 100 * millisecondsPerDay,
          },
          {
            id: '2',
            status: 'Milestone 2',
            startDate: new Date().getTime() - 50 * millisecondsPerDay,
            endDate: new Date().getTime() - 100 * millisecondsPerDay,
          },
          {
            id: '3',
            status: 'Milestone 3',
            startDate: new Date().getTime() - 50 * millisecondsPerDay,
            endDate: new Date().getTime() - 5 * millisecondsPerDay,
          },
        ],
        salesData: [
          {
            date: '2024-01-01',
            totalSales: 1000,
            comparison: 10,
          },
          {
            date: '2024-02-06',
            totalSales: 1000,
            comparison: 10,
          },
        ],
        workerRate: [
          {
            id: '1',
            name: 'Worker 1',
            avatar: 'avatar1',
            involvementRate: 50,
            hours: 10,
          },
          {
            id: '3',
            name: 'Worker 2',
            avatar: 'avatar2',
            involvementRate: 50,
            hours: 10,
          },
        ],
        members: ['1', '3'],
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'create project',
        payload: newProject,
      });
    } else {
      throw new Error('Method Not Allowed');
    }
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}
