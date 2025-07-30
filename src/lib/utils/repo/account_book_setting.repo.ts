import prisma from '@/client';
import { IAccountBookInfo, IAccountBookWithRelations } from '@/interfaces/account_book_setting';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { getTimestampNow } from '@/lib/utils/common';
import { DefaultValue } from '@/constants/default_value';
import { LeaveStatus } from '@/interfaces/team';
import { SortBy, SortOrder } from '@/constants/sort';
import { Prisma } from '@prisma/client';

export async function createCompanySetting(accountBookId: number) {
  const nowInSecond = getTimestampNow();
  let companySetting = null;

  try {
    companySetting = await prisma.accountBookSetting.create({
      data: {
        accountBookId,
        taxSerialNumber: '',
        representativeName: '',
        country: '',
        phone: '',
        address: { city: '', district: '', enteredAddress: '' },
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
      },
      include: {
        accountBook: true,
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

export async function getCompanySettingByCompanyId(accountBookId: number) {
  let companySetting = null;

  try {
    companySetting = await prisma.accountBookSetting.findFirst({
      where: { accountBookId },
      include: {
        accountBook: true,
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

export async function updateCompanySettingByCompanyId(options: {
  accountBookId: number;
  data: Partial<IAccountBookInfo>;
}) {
  const { accountBookId, data } = options;
  let companySetting = null;
  const nowInSecond = getTimestampNow();

  try {
    // Info: (20250521 - Shirley) 獲取現有的 companySetting
    const existingSetting = await prisma.accountBookSetting.findUnique({
      where: { accountBookId },
      select: { address: true },
    });

    // Info: (20250521 - Shirley) 解析現有的 address 資料
    const existingAddress = (existingSetting?.address as {
      city: string;
      district: string;
      enteredAddress: string;
    }) || { city: '', district: '', enteredAddress: '' };

    // Info: (20250521 - Shirley) 構建 address 欄位（支援新舊格式），只在請求中包含欄位時更新
    const addressData = {
      city:
        data.city !== undefined
          ? data.city
          : data.address && typeof data.address === 'object' && 'city' in data.address
            ? data.address.city
            : existingAddress.city,

      district:
        data.district !== undefined
          ? data.district
          : data.address && typeof data.address === 'object' && 'district' in data.address
            ? data.address.district
            : existingAddress.district,

      enteredAddress:
        data.enteredAddress !== undefined
          ? data.enteredAddress
          : data.address && typeof data.address === 'object' && 'enteredAddress' in data.address
            ? data.address.enteredAddress
            : typeof data.address === 'string'
              ? data.address
              : existingAddress.enteredAddress,
    };

    // Info: (20250521 - Shirley) 構建更新數據，只包含請求中實際提供的欄位
    const updateData: Prisma.AccountBookSettingUpdateInput = {
      address: addressData, // Info: (20250521 - Shirley) 已經考慮了現有值的地址物件
      updatedAt: nowInSecond,
      accountBook: {
        update: {},
      },
    };

    // Info: (20250521 - Shirley) 只在請求中包含欄位時添加到更新數據中
    if (data.taxSerialNumber !== undefined) updateData.taxSerialNumber = data.taxSerialNumber;
    if (data.representativeName !== undefined) {
      updateData.representativeName = data.representativeName;
    }
    if (data.country !== undefined) {
      updateData.country = data.country;
      updateData.countryCode = data.country;
    }
    if (data.businessLocation !== undefined) {
      updateData.countryCode = data.businessLocation;
    }
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.filingFrequency !== undefined) updateData.filingFrequency = data.filingFrequency;
    if (data.filingMethod !== undefined) updateData.filingMethod = data.filingMethod;
    if (data.declarantFilingMethod !== undefined) {
      updateData.declarantFilingMethod = data.declarantFilingMethod;
    }
    if (data.declarantName !== undefined) updateData.declarantName = data.declarantName;
    if (data.declarantPersonalId !== undefined) {
      updateData.declarantPersonalId = data.declarantPersonalId;
    }
    if (data.declarantPhoneNumber !== undefined) {
      updateData.declarantPhoneNumber = data.declarantPhoneNumber;
    }
    if (data.agentFilingRole !== undefined) updateData.agentFilingRole = data.agentFilingRole;
    if (data.licenseId !== undefined) updateData.licenseId = data.licenseId;

    // Info: (20250521 - Shirley) 處理公司相關欄位
    const companyUpdate: Prisma.AccountBookUpdateInput = {};
    if (data.accountBookName !== undefined) companyUpdate.name = data.accountBookName;
    if (data.accountBookTaxId !== undefined) companyUpdate.taxId = data.accountBookTaxId;
    if (data.accountBookStartDate !== undefined) {
      companyUpdate.startDate = data.accountBookStartDate;
    }

    // Info: (20250521 - Shirley) 確保只在有實際變更時才觸發關聯表的更新操作
    if (Object.keys(companyUpdate).length > 0) {
      updateData.accountBook = {
        update: companyUpdate,
      };
    } else {
      delete updateData.accountBook; // 沒有欄位需要更新時刪除
    }

    companySetting = await prisma.accountBookSetting.update({
      where: {
        accountBookId,
      },
      data: updateData,
      include: {
        accountBook: true,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'update company setting in updateCompanySettingByCompanyId failed',
      errorMessage: (error as Error).message,
    });
  }

  return companySetting;
}

export async function updateCompanySettingById(id: number, data: IAccountBookInfo) {
  let companySetting = null;
  const nowInSecond = getTimestampNow();

  try {
    companySetting = await prisma.accountBookSetting.update({
      where: { id },
      data: {
        taxSerialNumber: data.taxSerialNumber,
        representativeName: data.representativeName,
        country: data.country,
        phone: data.phone,
        address:
          typeof data.address === 'string'
            ? data.address
            : {
                city: data.address?.city || '',
                district: data.address?.district || '',
                enteredAddress: data.address?.enteredAddress || '',
              },
        updatedAt: nowInSecond,
        accountBook: {
          update: {
            name: data.accountBookName,
            taxId: data.accountBookTaxId,
            ...(data.accountBookStartDate ? { startDate: data.accountBookStartDate } : {}),
          },
        },
      },
      include: {
        accountBook: true,
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
    companySetting = await prisma.accountBookSetting.delete({
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

/**
 * Info: (20250421 - Shirley) Optimized version of getCompanySettingsByUserId
 * Reduces multiple DB queries to a single nested query with proper filtering
 * @param userId User ID
 * @param options Optional parameters: searchQuery, startDate, endDate, sortOption, pagination
 * @returns Company settings with enhanced relationship data and pagination information
 */
export async function getOptimizedCompanySettingsByUserId(
  userId: number,
  options?: {
    searchQuery?: string;
    startDate?: number;
    endDate?: number;
    includedImageFile?: boolean;
    sortOption?: Array<{ sortBy: SortBy; sortOrder: SortOrder }>;
    page?: number;
    pageSize?: number;
  }
) {
  const {
    searchQuery = '',
    startDate = 0,
    endDate = Math.floor(Date.now() / 1000),
    includedImageFile = false,
    sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
    page = 1,
    pageSize = 10,
  } = options || {};

  let companySettings: IAccountBookWithRelations[] = [];

  const companySettingsMap = new Map<number, IAccountBookWithRelations>();
  let totalCount = 0;

  try {
    const userTeams = await prisma.teamMember.findMany({
      where: {
        userId,
        status: LeaveStatus.IN_TEAM,
      },
      select: { teamId: true },
    });

    const teamIds = userTeams.map((team) => team.teamId);

    if (teamIds.length === 0) {
      loggerBack.info(`No teams found for user ${userId}`);
      return {
        companySettings,
        companySettingsMap,
        pagination: {
          totalCount: 0,
          totalPages: 0,
          page,
          pageSize,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    const orderBy = sortOption.map((option) => {
      const fieldMapping: Record<string, string> = {
        [SortBy.CREATED_AT]: 'createdAt',
        [SortBy.UPDATED_AT]: 'updatedAt',
        [SortBy.DATE_CREATED]: 'createdAt',
        [SortBy.DATE_UPDATED]: 'updatedAt',
      };

      const field = fieldMapping[option.sortBy] || 'createdAt';

      if (['createdAt', 'updatedAt', 'name', 'startDate'].includes(field)) {
        return {
          accountBook: {
            [field]: option.sortOrder.toLowerCase(),
          },
        };
      }

      return {
        [field]: option.sortOrder.toLowerCase(),
      };
    });

    // Info: (20250421 - Shirley) First get the total count for pagination
    const countResult = await prisma.accountBookSetting.count({
      where: {
        accountBook: {
          teamId: { in: teamIds },
          name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
          createdAt: { gte: startDate, lte: endDate },
          AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
        },
      },
    });

    totalCount = countResult;

    const results = await prisma.accountBookSetting.findMany({
      where: {
        accountBook: {
          teamId: { in: teamIds },
          name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
          createdAt: { gte: startDate, lte: endDate },
          AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
        },
      },
      orderBy: orderBy.length > 0 ? orderBy[0] : { accountBook: { createdAt: 'desc' } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        accountBook: {
          include: {
            imageFile: includedImageFile,
            team: {
              select: {
                id: true,
                name: true,
                ownerId: true,
                members: {
                  where: {
                    userId,
                    status: LeaveStatus.IN_TEAM,
                  },
                  select: {
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    companySettings = results;

    companySettings.forEach((setting) => {
      if (setting.accountBookId && setting.accountBook) {
        companySettingsMap.set(setting.accountBookId, setting);
      }
    });

    loggerBack.info(
      `Retrieved ${companySettings.length} company settings for user ${userId} (page ${page}, total ${totalCount})`
    );
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get optimized company settings failed',
      errorMessage: (error as Error).message,
    });
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    companySettings,
    companySettingsMap,
    pagination: {
      totalCount,
      totalPages,
      page,
      pageSize,
      hasNextPage,
      hasPreviousPage,
    },
  };
}
