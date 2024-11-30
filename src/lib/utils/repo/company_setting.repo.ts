import prisma from '@/client';
import { ICompanySetting } from '@/interfaces/company_setting';
import { loggerError } from '@/lib/utils/logger_back';
import { getTimestampNow } from '@/lib/utils/common';
import { DefaultValue } from '@/constants/default_value';

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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'create company setting in createCompanySetting failed',
      errorMessage: (error as Error).message,
    });
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get company setting in getCompanySettingByCompanyId failed',
      errorMessage: (error as Error).message,
    });
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'update company setting in updateCompanySettingById failed',
      errorMessage: (error as Error).message,
    });
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'delete company setting in deleteCompanySettingByIdForTesting failed',
      errorMessage: (error as Error).message,
    });
  }

  return companySetting;
}
