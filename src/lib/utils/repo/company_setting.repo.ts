import prisma from '@/client';
import { IAccountBookInfo, IAccountBookWithRelations } from '@/interfaces/company_setting';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { getTimestampNow } from '@/lib/utils/common';
import { DefaultValue } from '@/constants/default_value';
import { LeaveStatus } from '@/interfaces/team';
import { SortBy, SortOrder } from '@/constants/sort';

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

export async function updateCompanySettingByCompanyId(options: {
  companyId: number;
  data: Partial<IAccountBookInfo>;
}) {
  const { companyId, data } = options;
  let companySetting = null;
  const nowInSecond = getTimestampNow();

  try {
    companySetting = await prisma.companySetting.update({
      where: {
        companyId,
      },
      data: {
        taxSerialNumber: data.taxSerialNumber,
        representativeName: data.representativeName,
        country: data.country,
        countryCode: data.country,
        phone: data.phone,
        address: data.address,
        updatedAt: nowInSecond,
        company: {
          update: {
            name: data.companyName,
            taxId: data.companyTaxId,
            ...(data.companyStartDate ? { startDate: data.companyStartDate } : {}),
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
            ...(data.companyStartDate ? { startDate: data.companyStartDate } : {}),
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
          company: {
            [field]: option.sortOrder.toLowerCase(),
          },
        };
      }

      return {
        [field]: option.sortOrder.toLowerCase(),
      };
    });

    // Info: (20250421 - Shirley) First get the total count for pagination
    const countResult = await prisma.companySetting.count({
      where: {
        company: {
          teamId: { in: teamIds },
          name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
          createdAt: { gte: startDate, lte: endDate },
          AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
        },
      },
    });

    totalCount = countResult;

    const results = await prisma.companySetting.findMany({
      where: {
        company: {
          teamId: { in: teamIds },
          name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
          createdAt: { gte: startDate, lte: endDate },
          AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
        },
      },
      orderBy: orderBy.length > 0 ? orderBy[0] : { company: { createdAt: 'desc' } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        company: {
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
      if (setting.companyId && setting.company) {
        companySettingsMap.set(setting.companyId, setting);
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
