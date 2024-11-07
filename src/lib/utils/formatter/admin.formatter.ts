import { IAdmin } from '@/interfaces/admin';
import { Admin, Company, CompanyKYC, Role, User, UserAgreement, File } from '@prisma/client';
import { ICompany, ICompanyAndRoleDetail } from '@/interfaces/company';
import { IRole } from '@/interfaces/role';
import { formatUser } from '@/lib/utils/formatter/user.formatter';
import { formatCompany, formatCompanyDetail } from '@/lib/utils/formatter/company.formatter';

export async function formatAdminList(
  listedAdmin: (Admin & {
    company: Company & { imageFile: File | null };
    user: User & { userAgreements: UserAgreement[]; imageFile: File | null };
    role: Role;
  })[]
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
  admin: Admin & {
    company: Company & { imageFile: File | null };
    user: User & { userAgreements: UserAgreement[]; imageFile: File | null };
    role: Role;
  }
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

export function formatCompanyAndRoleList(
  listedCompanyAndRole: Array<{ company: Company & { imageFile: File | null }; role: Role }>
): Array<{ company: ICompany; role: IRole }> {
  const formattedCompanyAndRoleList = listedCompanyAndRole.map((companyAndRole) => {
    const formattedCompany = formatCompany(companyAndRole.company);
    const formattedRole = companyAndRole.role;
    return { company: formattedCompany, role: formattedRole };
  });
  return formattedCompanyAndRoleList;
}

export function formatCompanyAndRole(companyAndRole: {
  company: Company & { imageFile: File | null };
  tag: string;
  order: number;
  role: Role;
}): { company: ICompany; role: IRole; tag: string; order: number } {
  const formattedCompany = formatCompany(companyAndRole.company);
  const formattedRole = companyAndRole.role;
  return {
    company: formattedCompany,
    role: formattedRole,
    tag: companyAndRole.tag,
    order: companyAndRole.order,
  };
}

export function formatCompanyDetailAndRole(companyDetailAndRole: {
  company: Company & {
    admins: Admin[];
    companyKYCs: CompanyKYC[];
    imageFile: File | null;
  };
  role: Role;
}): ICompanyAndRoleDetail {
  const formattedCompany = formatCompanyDetail(companyDetailAndRole.company);
  const formattedRole = companyDetailAndRole.role;
  return { company: formattedCompany, role: formattedRole };
}
