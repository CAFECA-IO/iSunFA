import type { NextApiRequest, NextApiResponse } from 'next';
import { IAuditReports } from '@/interfaces/audit_reports';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

const responseDataArray: IAuditReports[] = [
  {
    id: 1,
    companyId: 1,
    code: '2330',
    regional: 'TW',
    company: 'TSMC',
    informationYear: '2024 Q1',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AAA',
    dateOfUpload: '2024-04-08',
    link: 'http://www.google.com.br',
  },
  {
    id: 2,
    companyId: 2,
    code: '2234',
    regional: 'TW',
    company: 'iSunFa',
    informationYear: '2024 Q2',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AA',
    dateOfUpload: '2024-04-08',
    link: 'http://www.google.com.br',
  },
];

const responseDataArray2: IAuditReports[] = [
  {
    id: 3,
    companyId: 1,
    code: '2330',
    regional: 'TW',
    company: 'TSMC',
    informationYear: '2024 Q1',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AAA',
    dateOfUpload: '2024-04-08',
    link: 'http://www.google.com.br',
  },
  {
    id: 4,
    companyId: 1,
    code: '2330',
    regional: 'TW',
    company: 'TSMC',
    informationYear: '2024 Q2',
    detailedInformation: 'IFRSs Consolidated Financial Report',
    creditRating: 'AAA',
    dateOfUpload: '2024-07-08',
    link: 'http://www.google.com.br',
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAuditReports[] | IAuditReports>>
) {
  // Todo: (20240620 - Gibbs) 這裡的程式碼需要進行重構
  // const { region = undefined, page = 1, limit = 10, begin = undefined, end = undefined, search = "" } = req.query;
  try {
    if (req.method !== 'GET') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);

      // Todo: (20240620 - Gibbs) 這裡的程式碼需要進行重構
      /*
    // no dateOfUpload, createdAt from report table created_at
    const auditReports = await prisma.auditReport.findMany({
      where: {
        // 如果有提供 region，則增加篩選條件
        ...(region && { company: { region: region } }),
        // 使用 AND 操作符來組合多個條件
        AND: [
          // 根據關聯的 report 的 createdAt 進行篩選
          {
            report: {
              createdAt: {
                gte: begin ? new Date(begin * 1000) : undefined, // 將 timestamp 轉換為 Date 物件
                lte: end ? new Date(end * 1000) : undefined,
              },
            },
          },
          // 如果有提供 search，則增加對應的模糊查詢條件
          ...(search && {
            OR: [
              { company: { name: { contains: search } } },
              { report: { name: { contains: search } } },
            ],
          }),
        ],
      },
      include: {
        company: true, // 包括關聯的 company 資料
        report: true,  // 包括關聯的 report 資料
      },
      skip: skip,
      take: limit,
    });
    */
      const { httpCode, result } = formatApiResponse<IAuditReports[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseDataArray2
      );
      res.status(httpCode).json(result);
    } else {
      const { httpCode, result } = formatApiResponse<IAuditReports[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseDataArray
      );
      res.status(httpCode).json(result);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IAuditReports>(
      error.message,
      {} as IAuditReports
    );
    res.status(httpCode).json(result);
  }
}
