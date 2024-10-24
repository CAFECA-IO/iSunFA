import prisma from '@/client';
import { ICompanySetting } from '@/interfaces/company_setting';
import { loggerError } from '@/lib/utils/logger_back';
import { getTimestampNow } from '@/lib/utils/common';

export async function createCompanySetting(companyId: number) {
  const nowInSecond = getTimestampNow();
  let companySetting = null;

  try {
    companySetting = await prisma.companySetting.create({
      data: {
        companyId,
        taxSerialNumber: '',
        representativeName: '',
        country: '',
        phone: '',
        address: '',
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
      },
      include: {
        company: true,
      },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'create company setting in createCompanySetting failed',
      error as Error
    );
    logError.error(
      'Prisma related create company setting in createCompanySetting in company_setting.repo.ts failed'
    );
  }

  return companySetting;
}

export async function getCompanySettingByCompanyId(companyId: number) {
  let companySetting = null;

  try {
    companySetting = await prisma.companySetting.findFirst({
      where: { companyId },
      include: {
        company: true,
      },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'get company setting in getCompanySettingByCompanyId failed',
      error as Error
    );
    logError.error(
      'Prisma related get company setting in getCompanySettingByCompanyId in company_setting.repo.ts failed'
    );
  }

  return companySetting;
}

export async function updateCompanySettingById(id: number, data: ICompanySetting) {
  let companySetting = null;
  const nowInSecond = getTimestampNow();

  try {
    companySetting = await prisma.companySetting.update({
      where: { id },
      data: {
        taxSerialNumber: data.taxSerialNumber,
        representativeName: data.representativeName,
        country: data.country,
        phone: data.phone,
        address: data.address,
        updatedAt: nowInSecond,
        company: {
          update: {
            name: data.companyName,
            taxId: data.companyTaxId,
          },
        },
      },
      include: {
        company: true,
      },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'update company setting in updateCompanySettingById failed',
      error as Error
    );
    logError.error(
      'Prisma related update company setting in updateCompanySettingById in company_setting.repo.ts failed'
    );
  }

  return companySetting;
}

export async function deleteCompanySettingByIdForTesting(id: number) {
  let companySetting = null;

  try {
    companySetting = await prisma.companySetting.delete({
      where: { id },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'delete company setting in deleteCompanySettingByIdForTesting failed',
      error as Error
    );
    logError.error(
      'Prisma related delete company setting in deleteCompanySettingByIdForTesting in company_setting.repo.ts failed'
    );
  }

  return companySetting;
}
