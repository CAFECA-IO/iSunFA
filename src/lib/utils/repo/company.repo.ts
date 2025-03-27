import prisma from '@/client';
import { Company, Prisma, File, CompanySetting } from '@prisma/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';

export async function getCompanyById(
  companyId: number
): Promise<(Company & { imageFile: File | null }) | null> {
  let company: (Company & { imageFile: File | null }) | null = null;
  if (companyId > 0) {
    company = await prisma.company.findUnique({
      where: {
        id: companyId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        imageFile: true,
      },
    });
  }
  return company;
}

export async function getCompanyWithSettingById(companyId: number): Promise<
  | (Company & {
      imageFile: File | null;
      companySettings: CompanySetting[];
    })
  | null
> {
  let company:
    | (Company & {
        imageFile: File | null;
        companySettings: CompanySetting[];
      })
    | null = null;
  if (companyId > 0) {
    company = await prisma.company.findUnique({
      where: {
        id: companyId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        imageFile: true,
        companySettings: true,
      },
    });
  }
  return company;
}

export async function getCompanyWithOwner(companyId: number): Promise<Company | null> {
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

export async function updateCompanyById(
  companyId: number,
  taxId?: string,
  name?: string,
  imageId?: number
): Promise<Company & { imageFile: File | null }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  const company = await prisma.company.update({
    where: {
      id: companyId,
    },
    data: {
      taxId,
      name,
      updatedAt: nowTimestamp,
      imageFileId: imageId,
    },
    include: {
      imageFile: true,
    },
  });
  return company;
}

export async function deleteCompanyById(
  companyId: number
): Promise<Company & { imageFile: File | null }> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.CompanyWhereUniqueInput = {
    id: companyId,
    OR: [{ deletedAt: 0 }, { deletedAt: null }],
  };

  const data: Prisma.CompanyUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const include = {
    imageFile: true,
  };

  const updateArgs = {
    where,
    data,
    include,
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

export async function putCompanyIcon(options: { companyId: number; fileId: number }) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const { companyId, fileId } = options;
  const updatedCompany = await prisma.company.update({
    where: {
      id: companyId,
    },
    data: {
      imageFile: {
        connect: {
          id: fileId,
        },
      },
      updatedAt: nowTimestamp,
    },
    include: {
      imageFile: true,
    },
  });
  return updatedCompany;
}
