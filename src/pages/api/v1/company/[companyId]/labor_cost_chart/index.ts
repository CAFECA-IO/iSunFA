import type { NextApiRequest, NextApiResponse } from 'next';
import { ILaborCostChartData } from '@/interfaces/labor_cost_chart';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, convertDateToTimestamp, timestampInSeconds } from '@/lib/utils/common';
import { isDateFormatYYYYMMDD } from '@/lib/utils/type_guard/date';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { getWorkRatesByCompanyId, getSalaryRecords } from '@/lib/utils/repo/labor_cost_chart.repo';
import { loggerError } from '@/lib/utils/logger_back';

async function calculateProjectCosts(
  workRates: {
    createdAt: number;
    employeeProjectId: number;
    actualHours: number;
    employeeProject: {
      project: {
        companyId: number;
        name: string;
      };
      projectId: number;
      employeeId: number;
    };
  }[],
  salaryRecords: {
    employee_id: number;
    total_payment: number;
    created_at: number;
  }[]
) {
  const projectCosts: Record<string, number> = {};
  if (!workRates.length || !salaryRecords.length) {
    return projectCosts;
  }
  // Info: (20240618 - Gibbs) 將 workRates 按照 employeeId 和 createdAt 分組, 避免重複計算
  const groupedWorkRates = workRates.reduce(
    (acc, wr) => {
      const key = `${wr.employeeProject.employeeId}-${wr.createdAt}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(wr);
      return acc;
    },
    {} as Record<string, typeof workRates>
  );
  // Info: (20240618 - Gibbs) 遍歷每一組 workRates
  Object.values(groupedWorkRates).forEach((group) => {
    const { createdAt } = group[0];
    const { employeeId } = group[0].employeeProject;
    // Info: (20240618 - Gibbs) 計算該員工在該日期的總工作時數
    const totalHours = group.reduce((sum, current) => sum + current.actualHours, 0);
    // Info: (20240618 - Gibbs) 找到該員工在該日期的薪資記錄
    const salaryRecordList = salaryRecords.filter(
      (sr) => sr.employee_id === employeeId && sr.created_at === createdAt
    );
    // Info: (20240619 - Gibbs) 加總該員工在該日期的所有薪資記錄
    const salaryRecord = salaryRecordList.reduce(
      (acc, sr) => {
        acc.total_payment += sr.total_payment;
        return acc;
      },
      { total_payment: 0 }
    );
    if (!salaryRecord) return; // Info: (20240618 - Gibbs) 如果沒有找到薪資記錄，則跳過
    // Info: (20240618 - Gibbs) 計算每小時薪資
    const hourlyWage = salaryRecord.total_payment / totalHours;
    // Info: (20240618 - Gibbs) 根據每個專案的工作時數比例分配薪資
    group.forEach((employeeWorkRate) => {
      const projectName = employeeWorkRate.employeeProject.project.name;
      if (!projectCosts[projectName]) {
        projectCosts[projectName] = 0;
      }
      projectCosts[projectName] += hourlyWage * employeeWorkRate.actualHours;
    });
  });
  return projectCosts;
}

async function checkEmpty(projectCosts: Record<string, number>) {
  return Object.keys(projectCosts).length === 0;
}

function formatDateQuery(req: NextApiRequest) {
  const { date } = req.query;
  if (date && isDateFormatYYYYMMDD(date as string)) {
    const dateTimestamp = convertDateToTimestamp(date as string);
    const dateTimestampInSeconds = timestampInSeconds(dateTimestamp);
    return { date: dateTimestampInSeconds };
  }
  return { date: null };
}

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ILaborCostChartData>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ILaborCostChartData | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { date } = formatDateQuery(req);
      if (date) {
        try {
          const workRates = await getWorkRatesByCompanyId(companyId, date);
          const salaryRecords = await getSalaryRecords(date);
          const projectCosts = await calculateProjectCosts(workRates, salaryRecords);
          const isEmpty = await checkEmpty(projectCosts);
          payload = {
            date,
            categories: Object.keys(projectCosts),
            series: Object.values(projectCosts),
            empty: isEmpty,
          };
          statusMessage = STATUS_MESSAGE.SUCCESS_GET;
        } catch (error) {
          const logError = loggerError(userId, 'handleGetRequest failed', error as Error);
          logError.error(
            'Prisma related func. in handleGetRequest in labor_cost_chart/index.ts failed'
          );
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
        }
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<ILaborCostChartData>>
  ) => Promise<{ statusMessage: string; payload: ILaborCostChartData | null }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ILaborCostChartData | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ILaborCostChartData | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<ILaborCostChartData | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
