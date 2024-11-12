import { NextApiRequest } from 'next';
import { CompanyRoleName } from '@/constants/role';
import { getProjectById } from '@/lib/utils/repo/project.repo';
import {
  getAdminByCompanyIdAndUserId,
  getAdminByCompanyIdAndUserIdAndRoleName,
  getAdminById,
} from '@/lib/utils/repo/admin.repo';
import { AuthFunctionsNew } from '@/interfaces/auth';
import { AUTH_CHECK } from '@/constants/auth';
import { getUserById } from '@/lib/utils/repo/user.repo';
import { ISessionData } from '@/interfaces/session_data';
import { convertStringToNumber } from '@/lib/utils/common';
import loggerBack from '@/lib/utils/logger_back';
import { APIName } from '@/constants/api_connection';

export async function checkUser(session: ISessionData, req: NextApiRequest) {
  let isAuth = true;
  const { userId: queryUserId } = req.query;
  if (queryUserId) {
    const queryUserIdNumber = convertStringToNumber(queryUserId);
    isAuth = session.userId === queryUserIdNumber;
  }
  if (isAuth) {
    const user = await getUserById(session.userId);
    isAuth = !!user;
  }

  return isAuth;
}

export async function checkUserAdmin(session: ISessionData, req: NextApiRequest) {
  const { userId: queryUserId, companyId: queryCompanyId } = req.query;
  const { companyId: bodyCompanyId } = req.body;
  const reqCompanyId = bodyCompanyId || queryCompanyId;
  const queryUserIdNumber = convertStringToNumber(queryUserId);
  const reqCompanyIdNumber = convertStringToNumber(reqCompanyId);
  let isAuth = session.userId === queryUserIdNumber && session.companyId === reqCompanyIdNumber;
  if (isAuth) {
    const admin = await getAdminByCompanyIdAndUserId(session.companyId, session.userId);
    isAuth = !!admin;
  }

  return isAuth;
}

export async function checkUserCompanyOwner(session: ISessionData, req: NextApiRequest) {
  const { userId: queryUserId, companyId: queryCompanyId } = req.query;
  const { companyId: bodyCompanyId } = req.body;
  const reqCompanyId = bodyCompanyId || queryCompanyId;
  const queryUserIdNumber = convertStringToNumber(queryUserId);
  const reqCompanyIdNumber = convertStringToNumber(reqCompanyId);
  let isAuth = session.userId === queryUserIdNumber && session.companyId === reqCompanyIdNumber;
  if (isAuth) {
    const admin = await getAdminByCompanyIdAndUserIdAndRoleName(
      session.companyId,
      session.userId,
      CompanyRoleName.OWNER
    );
    isAuth = !!admin;
  }

  return isAuth;
}

export async function checkUserCompanySuperAdmin(session: ISessionData, req: NextApiRequest) {
  const { userId: queryUserId, companyId: queryCompanyId } = req.query;
  const { companyId: bodyCompanyId } = req.body;
  const reqCompanyId = bodyCompanyId || queryCompanyId;
  const queryUserIdNumber = convertStringToNumber(queryUserId);
  const reqCompanyIdNumber = convertStringToNumber(reqCompanyId);
  let isAuth = session.userId === queryUserIdNumber && session.companyId === reqCompanyIdNumber;
  if (isAuth) {
    const admin = await getAdminByCompanyIdAndUserIdAndRoleName(
      session.companyId,
      session.userId,
      CompanyRoleName.SUPER_ADMIN
    );
    isAuth = !!admin;
  }

  return isAuth;
}

export async function checkCompanyAdminMatch(session: ISessionData, req: NextApiRequest) {
  const { adminId: queryAdminId, companyId: queryCompanyId } = req.query;
  const { companyId: bodyCompanyId } = req.body;
  const reqCompanyId = bodyCompanyId || queryCompanyId;
  const queryAdminIdNumber = convertStringToNumber(queryAdminId);
  const reqCompanyIdNumber = convertStringToNumber(reqCompanyId);
  let isAuth = session.companyId === reqCompanyIdNumber;
  if (isAuth) {
    const admin = await getAdminById(queryAdminIdNumber);
    isAuth = !!admin && admin.companyId === reqCompanyIdNumber;
  }

  return isAuth;
}

export async function checkProjectCompanyMatch(session: ISessionData, req: NextApiRequest) {
  const { projectId: queryProjectId, companyId: queryCompanyId } = req.query;
  const { companyId: bodyCompanyId } = req.body;
  const reqCompanyId = bodyCompanyId || queryCompanyId;
  const queryProjectIdNumber = convertStringToNumber(queryProjectId);
  const reqCompanyIdNumber = convertStringToNumber(reqCompanyId);
  let isAuth = session.companyId === reqCompanyIdNumber;
  if (isAuth) {
    const project = await getProjectById(queryProjectIdNumber);
    isAuth = !!project && project.companyId === reqCompanyIdNumber;
  }

  return isAuth;
}

// Info: (20240729 - Jacky) 檢查函數的映射表
export const authFunctionsNew: AuthFunctionsNew = {
  user: checkUser,
  admin: checkUserAdmin,
  owner: checkUserCompanyOwner,
  superAdmin: checkUserCompanySuperAdmin,
  CompanyAdminMatch: checkCompanyAdminMatch,
  projectCompanyMatch: checkProjectCompanyMatch,
};

export async function checkAuthorizationNew<T extends APIName>(
  apiName: T,
  req: NextApiRequest,
  session: ISessionData
): Promise<boolean> {
  const checkList = AUTH_CHECK[apiName];

  // Info: (20241111 - Jacky) 若 checkList 不存在，標記 hasFailed 為 true
  let hasFailed = false;

  if (!checkList) {
    hasFailed = true;
    loggerBack.error(`Authorization checkList not found for ${apiName}`);
    return false;
  } else {
    const results = await Promise.all(
      checkList.map(async (check) => {
        const authFunction = authFunctionsNew[check];
        let isFail = false;

        // Info: (20241111 - Jacky) 若 authFunction 不存在或檢查未通過，回傳 true
        if (!authFunction) {
          loggerBack.error(`Authorization function not found for check: ${check}`);
          isFail = true;
        } else {
          const isAuthorized = await authFunction(session, req);
          if (!isAuthorized) {
            loggerBack.error(`Authorization failed for check: ${check}`);
            isFail = true;
          }
        }

        return isFail;
      })
    );

    hasFailed = results.some((result) => result === true);
  }

  // Info: (20241111 - Jacky) 返回 hasFailed 的反向值，若 hasFailed 為 true 則回傳 false，反之亦然
  return !hasFailed;
}
