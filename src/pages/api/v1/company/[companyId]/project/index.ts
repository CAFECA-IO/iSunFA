import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { IProject } from '@/interfaces/project';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { IResponseData } from '@/interfaces/response_data';
import prisma from '@/client';
import { getSession } from '@/lib/utils/get_session';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProject | IProject[]>>
) {
  try {
    const session = await getSession(req, res);
    if (!session.userId) {
      throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
    }
    if (!session.companyId) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    const companyIdNum = Number(session.companyId);
    if (req.method === 'GET') {
      const projectList = await prisma.project.findMany({
        where: {
          companyId: companyIdNum,
        },
        include: {
          employeeProjects: {
            include: {
              employee: {
                select: {
                  name: true,
                  imageId: true,
                },
              },
            },
          },
        },
      });
      const projectListWithMembers: IProject[] = projectList.map((project) => {
        const members = project.employeeProjects.map((employeeProject) => ({
          name: employeeProject.employee.name,
          imageId: employeeProject.employee.imageId as string,
        }));
        const { employeeProjects, ...projectData } = project;
        return {
          ...projectData,
          members,
          // ToDo: (20240607 - Julian) For matching the interface
          income: 0,
          expense: 0,
          profit: 0,
          contractAmount: 0,
        };
      });
      const { httpCode, result } = formatApiResponse<IProject[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        projectListWithMembers
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010002 - POST /project
    } else if (req.method === 'POST') {
      const { name, stage, members } = req.body;
      if (!name || !stage || !members) {
        throw new Error('Invalid input parameter');
      }
      const now = Date.now();
      const nowTimestamp = timestampInSeconds(now);
      const newProject = await prisma.project.create({
        data: {
          companyId: companyIdNum,
          name,
          stage,
          employeeProjects: {
            create: members.map((memberId: number) => ({
              employeeId: memberId,
            })),
          },
          completedPercent: 0,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
        include: {
          employeeProjects: {
            include: {
              employee: {
                select: {
                  name: true,
                  imageId: true,
                },
              },
            },
          },
        },
      });
      const newProjectWithMembers = {
        ...newProject,
        members: newProject.employeeProjects.map((employeeProject) => ({
          name: employeeProject.employee.name,
          imageId: employeeProject.employee.imageId as string,
        })),
        // ToDo: (20240607 - Julian) For matching the interface
        income: 0,
        expense: 0,
        profit: 0,
        contractAmount: 0,
      };
      const { employeeProjects, ...project } = newProjectWithMembers;
      const { httpCode, result } = formatApiResponse<IProject>(STATUS_MESSAGE.CREATED, project);
      res.status(httpCode).json(result);
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
