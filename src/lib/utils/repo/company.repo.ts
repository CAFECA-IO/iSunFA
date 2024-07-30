import prisma from '@/client';
import { Admin, Company, Prisma } from '@prisma/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { ROLE_NAME } from '@/constants/role_name';

export async function getCompanyById(companyId: number): Promise<Company | null> {
  let company: Company | null = null;
  if (companyId > 0) {
    company = await prisma.company.findUnique({
      where: {
        id: companyId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });
  }
  return company;
}

export async function getCompanyByCode(code: string): Promise<Company | null> {
  let company: Company | null = null;
  if (code) {
    company = await prisma.company.findUnique({
      where: {
        code,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });
  }
  return company;
}

export async function getCompanyWithOwner(companyId: number): Promise<
  | (Company & {
      admins: Admin[];
    })
  | null
> {
  let company:
    | (Company & {
        admins: Admin[];
      })
    | null = null;
  if (companyId > 0) {
    company = await prisma.company.findUnique({
      where: {
        id: companyId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        admins: {
          where: {
            role: {
              name: ROLE_NAME.OWNER,
            },
          },
        },
      },
    });
  }
  return company;
}

export async function updateCompanyById(
  companyId: number,
  code?: string,
  name?: string,
  regional?: string,
  imageId?: string
): Promise<Company> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const company = await prisma.company.update({
    where: {
      id: companyId,
    },
    data: {
      code,
      name,
      regional,
      imageId,
      updatedAt: nowTimestamp,
    },
  });
  return company;
}

export async function deleteCompanyById(companyId: number): Promise<Company> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.CompanyWhereUniqueInput = {
    id: companyId,
    deletedAt: null,
  };

  const data: Prisma.CompanyUpdateInput = {
    deletedAt: nowInSecond,
  };

  const updateArgs = {
    where,
    data,
  };

  const company = await prisma.company.update(updateArgs);
  return company;
}

export async function deleteCompanyByIdForTesting(companyId: number): Promise<Company> {
  const company = await prisma.company.delete({
    where: {
      id: companyId,
    },
  });
  return company;
}
