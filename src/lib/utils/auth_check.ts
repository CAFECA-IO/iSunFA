import { STATUS_MESSAGE } from '@/constants/status_code';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import { getProjectById } from '@/lib/utils/repo/project.repo';
import {
  getAdminByCompanyIdAndUserId,
  getAdminByCompanyIdAndUserIdAndRoleName,
  getAdminById,
} from '@/lib/utils/repo/admin.repo';
import { AllRequiredParams, AuthFunctions, AuthFunctionsKeys } from '@/interfaces/auth';
import { FREE_COMPANY_ID } from '@/constants/config';
import { CompanyRoleName } from '@/constants/role';
import { getUserById } from '@/lib/utils/repo/user.repo';

export async function checkUser(params: { userId: number }) {
  const user = await getUserById(params.userId);
  return !!user;
}

export async function checkAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  const { companyId, userId } = session;
  if (!userId) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  if (!companyId) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  if (typeof companyId !== 'number' || typeof userId !== 'number') {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }
  const admin = await getAdminByCompanyIdAndUserId(companyId, userId);
  if (!admin) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  return session;
}

export async function checkUserAdmin(params: {
  userId: number;
  companyId: number;
}): Promise<boolean> {
  const admin = await getAdminByCompanyIdAndUserId(params.companyId, params.userId);
  return !!admin;
}

export async function checkUserCompanyOwner(params: {
  userId: number;
  companyId: number;
}): Promise<boolean> {
  const admin = await getAdminByCompanyIdAndUserIdAndRoleName(
    params.companyId,
    params.userId,
    CompanyRoleName.OWNER
  );
  return !!admin;
}

export async function checkUserCompanySuperAdmin(params: {
  userId: number;
  companyId: number;
}): Promise<boolean> {
  const admin = await getAdminByCompanyIdAndUserIdAndRoleName(
    params.companyId,
    params.userId,
    CompanyRoleName.SUPER_ADMIN
  );
  return !!admin;
}

export async function checkCompanyAdminMatch(params: {
  companyId: number;
  adminId: number;
}): Promise<boolean> {
  let isAuth = true;
  const getAdmin = await getAdminById(params.adminId);
  if (!getAdmin) {
    isAuth = false;
  } else if (getAdmin.companyId !== params.companyId) {
    isAuth = false;
  }
  return isAuth;
}

export async function checkProjectCompanyMatch(params: { projectId: number; companyId: number }) {
  const getProject = await getProjectById(params.projectId);
  const match = getProject !== null && getProject.companyId === params.companyId;
  return match;
}

// Info: (20240729 - Jacky) 檢查函數的映射表
export const authFunctions: AuthFunctions = {
  user: checkUser,
  admin: checkUserAdmin,
  owner: checkUserCompanyOwner,
  superAdmin: checkUserCompanySuperAdmin,
  CompanyAdminMatch: checkCompanyAdminMatch,
  projectCompanyMatch: checkProjectCompanyMatch,
};

export async function checkAuthorization<T extends AuthFunctionsKeys[]>(
  requiredChecks: T,
  authParams: AllRequiredParams<T>
): Promise<boolean> {
  let isAuthorized = false;

  // Info: (20240729 - Jacky) 檢查 companyId 是否為 FREE_COMPANY_ID
  if (
    typeof authParams === 'object' &&
    authParams !== null &&
    'companyId' in authParams &&
    authParams.companyId === FREE_COMPANY_ID
  ) {
    isAuthorized = true;
  } else {
    const results = await Promise.all(
      requiredChecks.map(async (check) => {
        const checkFunction = authFunctions[check] as (
          params: typeof authParams
        ) => Promise<boolean>;
        const checked = await checkFunction(authParams);
        return checked;
      })
    );

    isAuthorized = results.every((result) => result);
  }

  return isAuthorized;
}
