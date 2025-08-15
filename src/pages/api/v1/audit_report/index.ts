import type { NextApiRequest, NextApiResponse } from 'next';
import { IAuditReports } from '@/interfaces/audit_reports';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { HttpMethod } from '@/constants/api_connection';
import { formatApiResponse, convertStringToNumber, pageToOffset } from '@/lib/utils/common';
import { isTimestamp } from '@/lib/utils/type_guard/date';
import prisma from '@/client';

function parsedSearch(search: string) {
  // Info: (20240621 - Gibbs) 匹配所有數字部分
  const numbers = search.match(/\d+/g) || [];
  // Info: (20240621 - Gibbs) 匹配所有非數字且非空白的文字部分
  const texts = search.match(/[^\d\s]+/g) || [];
  return {
    numbers,
    texts,
  };
}

function getSearchConditions(numbers: [], texts: []) {
  const numbersConditions = numbers.map((number) => ({
    OR: [
      { company: { code: { contains: number } } },
      { company: { name: { contains: number } } },
      { informationYear: { contains: number } },
    ],
  }));
  const textsConditions = texts.map((text) => ({
    OR: [{ company: { name: { contains: text } } }, { informationYear: { contains: text } }],
  }));
  return {
    numbersConditions,
    textsConditions,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAuditReports[] | IAuditReports>>
) {
  const { page = '1', limit = '10', begin, end, search = '' } = req.query;
  try {
    if (req.method !== HttpMethod.GET) {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
    const pageValue = convertStringToNumber(page);
    const limitValue = convertStringToNumber(limit);
    // Info: (20240621 - Gibbs) begin, end 如果是 timestamp, 轉成數字 timestamp; 如果是 undefined, 給值 undefined
    const endValue = end ? (isTimestamp(end as string) ? Number(end) : undefined) : undefined;
    const beginValue = begin
      ? isTimestamp(begin as string)
        ? Number(begin)
        : undefined
      : undefined;
    const offset = pageToOffset(pageValue, limitValue);
    const { numbers, texts } = parsedSearch(search as string);
    const { numbersConditions, textsConditions } = getSearchConditions(numbers as [], texts as []);

    const auditReports = await prisma.auditReport.findMany({
      where: {
        // Info: (20240621 - Gibbs) 使用 AND 操作符來組合多個條件
        AND: [
          // Info: (20240621 - Gibbs) 如果有提供 region，則增加篩選條件
          {
            report: {
              // Info: (20240621 - Gibbs) 根據關聯的 report 的 createdAt 進行篩選
              createdAt: {
                gte: beginValue,
                lte: endValue,
              },
            },
          },
          // Info: (20240621 - Gibbs) 將 numbersConditions 和 textsConditions 整合進查詢條件
          {
            OR: [...numbersConditions, ...textsConditions],
          },
        ],
      },
      include: {
        // Info: (20240621 - Gibbs) 關聯 company, report 資料
        accountBook: true,
        report: true,
      },
      skip: offset,
      take: limitValue,
    });
    const responseDataArray = auditReports.map((auditReport) => ({
      id: auditReport.id,
      accountBookId: auditReport.accountBookId,
      code: auditReport.accountBook.taxId,
      company: auditReport.accountBook.name,
      informationYear: auditReport.informationYear,
      detailedInformation: auditReport.report.name,
      creditRating: auditReport.creditRating,
      dateOfUpload: String(auditReport.report.createdAt),
      link: auditReport.report.downloadLink as string,
    }));

    const { httpCode, result } = formatApiResponse<IAuditReports[]>(
      STATUS_MESSAGE.SUCCESS_GET,
      responseDataArray
    );
    res.status(httpCode).json(result);
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IAuditReports>(
      error.message,
      {} as IAuditReports
    );
    res.status(httpCode).json(result);
  }
}
