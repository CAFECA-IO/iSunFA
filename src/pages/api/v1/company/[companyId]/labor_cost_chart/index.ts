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
  // Deprecated: using console.log to debug (20240619 - Gibbs)
  // console.log("groupedWorkRates", groupedWorkRates);
  // Info: (20240618 - Gibbs) 遍歷每一組 workRates
  Object.values(groupedWorkRates).forEach((group) => {
    const { createdAt } = group[0];
    const { employeeId } = group[0].employeeProject;
    // Deprecated: using console.log to debug (20240619 - Gibbs)
    // console.log("employeeId", employeeId);
    // Info: (20240618 - Gibbs) 計算該員工在該日期的總工作時數
    const totalHours = group.reduce((sum, current) => sum + current.actualHours, 0);
    // Deprecated: using console.log to debug (20240619 - Gibbs)
    // console.log("totalHours", totalHours);
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
    // Deprecated: using console.log to debug (20240619 - Gibbs)
    // console.log("salaryRecord", salaryRecord);
    if (!salaryRecord) return; // Info: (20240618 - Gibbs) 如果沒有找到薪資記錄，則跳過
    // Info: (20240618 - Gibbs) 計算每小時薪資
    const hourlyWage = salaryRecord.total_payment / totalHours;
    // Deprecated: using console.log to debug (20240619 - Gibbs)
    // console.log("hourlyWage", hourlyWage);
    // Info: (20240618 - Gibbs) 根據每個專案的工作時數比例分配薪資
    group.forEach((employeeWorkRate) => {
      const projectName = employeeWorkRate.employeeProject.project.name;
      if (!projectCosts[projectName]) {
        projectCosts[projectName] = 0;
      }
      projectCosts[projectName] += hourlyWage * employeeWorkRate.actualHours;
    });
  });
  // Deprecated: using console.log to debug (20240619 - Gibbs)
  // console.log("projectCosts", projectCosts);
  return projectCosts;
}

async function checkEmpty(projectCosts: Record<string, number>) {
  return Object.keys(projectCosts).length === 0;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ILaborCostChartData>>
) {
  try {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
    if (!isAuth) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }
    if (req.method !== 'GET') {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
    const { date } = req.query;
    if (date && isDateFormatYYYYMMDD(date as string)) {
      const dateTimestamp = convertDateToTimestamp(date as string);
      const dateTimestampInSeconds = timestampInSeconds(dateTimestamp);
      const workRates = await getWorkRatesByCompanyId(companyId, dateTimestampInSeconds);
      // Deprecated: using console.log to debug (20240619 - Gibbs)
      // console.log("workRates", workRates);
      const salaryRecords = await getSalaryRecords(dateTimestampInSeconds);
      // Deprecated: using console.log to debug (20240619 - Gibbs)
      // console.log("salaryRecords", salaryRecords);
      const projectCosts = await calculateProjectCosts(workRates, salaryRecords);
      const isEmpty = await checkEmpty(projectCosts);
      // Deprecated: using console.log to debug (20240619 - Gibbs)
      // console.log("isEmpty", isEmpty);
      const responseData = {
        date: dateTimestampInSeconds,
        categories: Object.keys(projectCosts),
        series: Object.values(projectCosts),
        empty: isEmpty,
      };
      const { httpCode, result } = formatApiResponse<ILaborCostChartData>(
        STATUS_MESSAGE.SUCCESS_GET,
        responseData
      );
      res.status(httpCode).json(result);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ILaborCostChartData>(
      error.message,
      {} as ILaborCostChartData
    );
    res.status(httpCode).json(result);
  }
}
