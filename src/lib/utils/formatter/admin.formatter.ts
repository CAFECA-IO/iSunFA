import { IAdmin } from '@/interfaces/admin';
import { Admin, Company, Role, User } from '@prisma/client';
import { ICompany, ICompanyDetail } from '@/interfaces/company';
import { IRole } from '@/interfaces/role';
import { formatUser } from '@/lib/utils/formatter/user.formatter';
import { formatCompany, formatCompanyDetail } from '@/lib/utils/formatter/company.formatter';

export async function formatAdminList(
  listedAdmin: (Admin & { company: Company; user: User; role: Role })[]
): Promise<IAdmin[]> {
  let adminList: IAdmin[] = [];
  if (listedAdmin.length > 0) {
    const formatPromises = listedAdmin.map(async (admin) => {
      const formattedUser = await formatUser(admin.user);
      const formattedCompany = await formatCompany(admin.company);
      const formattedAdmin = {
        ...admin,
        endDate: admin.endDate ?? 0,
        user: formattedUser,
        company: formattedCompany,
      };
      return formattedAdmin;
    });
    adminList = await Promise.all(formatPromises);
  }
  return adminList;
}

export async function formatAdmin(
  admin: Admin & { company: Company; user: User; role: Role }
): Promise<IAdmin> {
  const formattedUser = await formatUser(admin.user);
  const formattedCompany = await formatCompany(admin.company);
  const formattedAdmin: IAdmin = {
    ...admin,
    user: formattedUser,
    company: formattedCompany,
    endDate: admin.endDate ?? 0,
  };
  return formattedAdmin;
}

export async function formatCompanyAndRoleList(
  listedCompanyAndRole: Array<{ company: Company; role: Role }>
): Promise<Array<{ company: ICompany; role: IRole }>> {
  const formatPromises = listedCompanyAndRole.map(async (companyAndRole) => {
    const formattedCompany = await formatCompany(companyAndRole.company);
    const formattedRole = companyAndRole.role;
    return { company: formattedCompany, role: formattedRole };
  });
  const formattedCompanyAndRoleList: Array<{ company: ICompany; role: IRole }> =
    await Promise.all(formatPromises);
  return formattedCompanyAndRoleList;
}

export async function formatCompanyAndRole(companyAndRole: {
  company: Company;
  role: Role;
}): Promise<{ company: ICompany; role: IRole }> {
  const formattedCompany = await formatCompany(companyAndRole.company);
  const formattedRole = companyAndRole.role;
  return { company: formattedCompany, role: formattedRole };
}

export function formatCompanyDetailAndRole(companyDetailAndRole: {
  company: Company & {
    admins: Admin[];
  };
  role: Role;
}): { company: ICompanyDetail; role: IRole } {
  const formattedCompany = formatCompanyDetail(companyDetailAndRole.company);
  const formattedRole = companyDetailAndRole.role;
  return { company: formattedCompany, role: formattedRole };
}
