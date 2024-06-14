import type { NextApiRequest, NextApiResponse } from 'next';
import { IGeneratedReportItem } from '@/interfaces/report_item';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import prisma from '@/client';

async function getProject(projectId: number) {
  const projectInfo = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      name: true,
      imageId: true,
    },
  });
  if (!projectInfo) {
    return null;
  } else {
    return {
      id: (projectInfo.id).toString(),
      name: projectInfo.name,
      code: projectInfo.imageId,
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IGeneratedReportItem[] | IGeneratedReportItem>>
) {
  try {
    if (req.method !== 'GET') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
    const generatedReportsData = await prisma.report.findMany({
      where: {
        status: 'generated',
      },
    });
    if (generatedReportsData.length > 0) {
      const generatedReportItems = await Promise.all(generatedReportsData.map(async (report) => {
        const { projectId } = report;
        let projectData = null;
        if (projectId !== null) {
          projectData = await getProject(projectId);
        }
        return {
          id: report.id.toString(),
          name: report.name,
          createdTimestamp: report.createdAt,
          period: {
            startTimestamp: report.from,
            endTimestamp: report.to,
          },
          type: report.type,
          reportType: report.reportType,
          project: projectData,
          reportLinkId: report.reportLink,
          downloadLink: report.downloadLink,
          blockchainExplorerLink: report.blockChainExplorerLink,
          evidenceId: report.evidenceId,
        };
      }));
      const { httpCode, result } = formatApiResponse<IGeneratedReportItem[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        generatedReportItems as IGeneratedReportItem[]
      );
      res.status(httpCode).json(result);
    } else {
      const { httpCode, result } = formatApiResponse<IGeneratedReportItem[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        []
      );
      res.status(httpCode).json(result);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IGeneratedReportItem>(
      error.message,
      {} as IGeneratedReportItem
    );
    res.status(httpCode).json(result);
  }
}
