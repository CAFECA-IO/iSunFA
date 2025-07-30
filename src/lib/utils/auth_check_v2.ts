import { NextApiRequest } from 'next';
import { getProjectById } from '@/lib/utils/repo/project.repo';
import { AuthFunctionsNew } from '@/interfaces/auth';
import { AUTH_CHECK, AUTH_WHITELIST } from '@/constants/auth';
import { getUserById } from '@/lib/utils/repo/user.repo';
import { ISessionData } from '@/interfaces/session';
import { convertStringToNumber } from '@/lib/utils/common';
import loggerBack from '@/lib/utils/logger_back';
import { APIName } from '@/constants/api_connection';
import { verifyApplySignature } from '@/lib/utils/ethers/verify_signature';

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
  loggerBack.info(`User authorization check for userId isAuth: ${isAuth}`);

  return isAuth;
}

export async function checkUserAdmin(session: ISessionData, req: NextApiRequest) {
  const { userId: queryUserId, companyId: queryCompanyId } = req.query;
  const { companyId: bodyCompanyId } = req.body;
  const reqCompanyId = bodyCompanyId || queryCompanyId;
  const queryUserIdNumber = convertStringToNumber(queryUserId);
  const reqCompanyIdNumber = convertStringToNumber(reqCompanyId);
  const isAuth =
    session.userId === queryUserIdNumber && session.accountBookId === reqCompanyIdNumber;

  return isAuth;
}

export async function checkUserCompanyOwner(session: ISessionData, req: NextApiRequest) {
  const { userId: queryUserId, companyId: queryCompanyId } = req.query;
  const { companyId: bodyCompanyId } = req.body;
  const reqCompanyId = bodyCompanyId || queryCompanyId;
  const queryUserIdNumber = convertStringToNumber(queryUserId);
  const reqCompanyIdNumber = convertStringToNumber(reqCompanyId);
  const isAuth =
    session.userId === queryUserIdNumber && session.accountBookId === reqCompanyIdNumber;

  return isAuth;
}

export async function checkUserCompanySuperAdmin(session: ISessionData, req: NextApiRequest) {
  const { userId: queryUserId, companyId: queryCompanyId } = req.query;
  const { companyId: bodyCompanyId } = req.body;
  const reqCompanyId = bodyCompanyId || queryCompanyId;
  const queryUserIdNumber = convertStringToNumber(queryUserId);
  const reqCompanyIdNumber = convertStringToNumber(reqCompanyId);
  const isAuth =
    session.userId === queryUserIdNumber && session.accountBookId === reqCompanyIdNumber;

  return isAuth;
}

export async function checkCompanyAdminMatch(session: ISessionData, req: NextApiRequest) {
  const { companyId: queryCompanyId } = req.query;
  const { companyId: bodyCompanyId } = req.body;
  const reqCompanyId = bodyCompanyId || queryCompanyId;
  const reqCompanyIdNumber = convertStringToNumber(reqCompanyId);
  const isAuth = session.accountBookId === reqCompanyIdNumber;

  return isAuth;
}

export async function checkProjectCompanyMatch(session: ISessionData, req: NextApiRequest) {
  const { projectId: queryProjectId, companyId: queryCompanyId } = req.query;
  const { companyId: bodyCompanyId } = req.body;
  const reqCompanyId = bodyCompanyId || queryCompanyId;
  const queryProjectIdNumber = convertStringToNumber(queryProjectId);
  const reqCompanyIdNumber = convertStringToNumber(reqCompanyId);
  let isAuth = session.accountBookId === reqCompanyIdNumber;
  if (isAuth) {
    const project = await getProjectById(queryProjectIdNumber);
    isAuth = !!project && project.accountBookId === reqCompanyIdNumber;
  }

  return isAuth;
}

export function isWhitelisted(apiName: APIName, req: NextApiRequest): boolean {
  const whitelistConditions = AUTH_WHITELIST[apiName as keyof typeof AUTH_WHITELIST];
  if (!whitelistConditions) return false;

  if (whitelistConditions.query) {
    const queryMatches = Object.entries(whitelistConditions.query).every(
      ([key, value]) => req.query[key] === value
    );
    if (!queryMatches) return false;
  }

  loggerBack.debug(
    `Auth check passed for whitelisted API: ${apiName} and query: ${JSON.stringify(req.query)}`
  );

  return true;
}

// Info: (20240729 - Jacky) 檢查函數的映射表
export const authFunctionsNew: AuthFunctionsNew = {
  user: checkUser,
  admin: checkUserAdmin,
  owner: checkUserCompanyOwner,
  superAdmin: checkUserCompanySuperAdmin,
<<<<<<< HEAD
  AccountBookAdminMatch: checkCompanyAdminMatch,
  projectAccountBookMatch: checkProjectCompanyMatch,
=======
  CompanyAdminMatch: checkCompanyAdminMatch,
  projectCompanyMatch: checkProjectCompanyMatch,
  internal: async (_session: ISessionData, req: NextApiRequest) => {
    loggerBack.info(
      `[internal verify] req.headers: ${JSON.stringify(req.headers)}, req.url: ${req.url}`
    );
    const rlpEncoded = req.headers['x-signature'];
    loggerBack.info(`[internal verify] rlpEncoded: ${rlpEncoded}`);
    const url = `http://${req.headers.host}${req.url}`;

    if (typeof rlpEncoded !== 'string' || typeof url !== 'string') {
      loggerBack.warn('驗證失敗：缺少 x-signature 或 x-url header');
      return false;
    }

    const result = verifyApplySignature(url, rlpEncoded);

    loggerBack.info(
      `[internal verify] url=${url}, isValid=${result.isValid}, signer=${result.address}`
    );

    return result.isValid;
  },
>>>>>>> feature/fix-integration-test-refactoring
};

export async function checkAuthorizationNew<T extends APIName>(
  apiName: T,
  req: NextApiRequest,
  session: ISessionData
): Promise<boolean> {
  const checkList = AUTH_CHECK[apiName];
  loggerBack.info(
    `Checking authorization for API: ${apiName}, CheckList: ${JSON.stringify(checkList)}`
  );

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
        loggerBack.info(
          `Executing auth check: ${check} with authFunction: ${JSON.stringify(authFunction)}`
        );
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

  loggerBack.info(`Authorization check completed for API: ${apiName}, hasFailed: ${hasFailed}`);

  // Info: (20241111 - Jacky) 返回 hasFailed 的反向值，若 hasFailed 為 true 則回傳 false，反之亦然
  return !hasFailed;
}
