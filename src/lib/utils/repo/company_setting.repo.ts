import prisma from '@/client';
import { ICompanySetting, ICompanySettingWithRelations } from '@/interfaces/company_setting';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { getTimestampNow } from '@/lib/utils/common';
import { DefaultValue } from '@/constants/default_value';
import { CompanySetting, Company } from '@prisma/client';
import { LeaveStatus } from '@/interfaces/team';

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
  data: Partial<ICompanySetting>;
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
 * Info: (20250421 - Shirley) 批量獲取多個公司的設置信息
 * @param companyIds 公司ID數組
 * @returns 包含公司設置信息的數組
 */
export async function getCompanySettingsByCompanyIds(companyIds: number[]) {
  let companySettings: Array<CompanySetting & { company: Company | null }> = [];

  if (!companyIds || companyIds.length === 0) {
    return [];
  }

  try {
    companySettings = await prisma.companySetting.findMany({
      where: {
        companyId: { in: companyIds },
      },
      include: {
        company: true,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get company settings in getCompanySettingsByCompanyIds failed',
      errorMessage: (error as Error).message,
    });
  }

  return companySettings;
}

/**
 * Info: (20250421 - Shirley) 根據用戶ID獲取所有相關公司的設置信息
 *
 * 此函數直接查詢用戶有權訪問的所有帳本的公司設置，無需先獲取帳本再查詢設置
 *
 * @param userId 用戶ID
 * @param options 可選參數，如搜索關鍵詞等
 * @returns 包含公司設置信息的數組，並以公司ID為鍵的映射
 */
export async function getCompanySettingsByUserId(
  userId: number,
  options?: {
    searchQuery?: string;
    startDate?: number;
    endDate?: number;
  }
) {
  const {
    searchQuery = '',
    startDate = 0,
    endDate = Math.floor(Date.now() / 1000),
  } = options || {};

  let companySettings: Array<CompanySetting & { company: Company }> = [];
  const companySettingsMap = new Map<number, CompanySetting & { company: Company }>();

  try {
    // 查詢用戶所屬的所有團隊
    const userTeams = await prisma.teamMember.findMany({
      where: {
        userId,
        status: LeaveStatus.IN_TEAM,
      },
      select: { teamId: true },
    });

    const teamIds = userTeams.map((team) => team.teamId);

    if (teamIds.length === 0) {
      return { companySettings, companySettingsMap };
    }

    // 查詢團隊內的所有公司(帳本)，並加上搜索條件
    const companies = await prisma.company.findMany({
      where: {
        teamId: { in: teamIds },
        name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
        createdAt: { gte: startDate, lte: endDate },
        AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
      },
      select: { id: true },
    });

    const companyIds = companies.map((company) => company.id);

    if (companyIds.length === 0) {
      return { companySettings, companySettingsMap };
    }

    // 獲取所有公司的設置
    companySettings = (await prisma.companySetting.findMany({
      where: {
        companyId: { in: companyIds },
      },
      include: {
        company: true,
      },
    })) as Array<CompanySetting & { company: Company }>;

    // 創建映射，方便快速查找
    companySettings.forEach((setting) => {
      if (setting.companyId && setting.company) {
        companySettingsMap.set(setting.companyId, setting);
      }
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get company settings in getCompanySettingsByUserId failed',
      errorMessage: (error as Error).message,
    });
  }

  return { companySettings, companySettingsMap };
}

/**
 * Info: (20250421 - Shirley) Enhanced version of getCompanySettingsByUserId
 * This function optimizes database queries by using Prisma's relations
 * and includes more company and team data needed for account book listings
 *
 * @param userId User ID
 * @param options Optional parameters: searchQuery, startDate, endDate
 * @returns Company settings with enhanced relationship data
 */
export async function getEnhancedCompanySettingsByUserId(
  userId: number,
  options?: {
    searchQuery?: string;
    startDate?: number;
    endDate?: number;
    includedImageFile?: boolean;
  }
) {
  const {
    searchQuery = '',
    startDate = 0,
    endDate = Math.floor(Date.now() / 1000),
    includedImageFile = false,
  } = options || {};

  let companySettings: ICompanySettingWithRelations[] = [];
  const companySettingsMap = new Map<number, ICompanySettingWithRelations>();

  try {
    // Use a single query to get all company settings for the user's teams
    const results = await prisma.companySetting.findMany({
      where: {
        company: {
          teamId: {
            in: await prisma.teamMember
              .findMany({
                where: {
                  userId,
                  status: LeaveStatus.IN_TEAM,
                },
                select: { teamId: true },
              })
              .then((teams) => teams.map((team) => team.teamId)),
          },
          name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
          createdAt: { gte: startDate, lte: endDate },
          AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
        },
      },
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

    // Type cast the results to our interface
    companySettings = results as ICompanySettingWithRelations[];

    // Build a map for quick access to settings by company ID
    companySettings.forEach((setting) => {
      if (setting.companyId && setting.company) {
        companySettingsMap.set(setting.companyId, setting);
      }
    });

    loggerBack.info(`Retrieved ${companySettings.length} company settings for user ${userId}`);
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get enhanced company settings in getEnhancedCompanySettingsByUserId failed',
      errorMessage: (error as Error).message,
    });
  }

  return { companySettings, companySettingsMap };
}

/**
 * Info: (20250421 - Shirley) Optimized version of getCompanySettingsByUserId
 * This function eliminates nested awaits and uses a cleaner approach
 * for querying company settings by user ID with proper relationship handling
 *
 * @param userId User ID
 * @param options Optional parameters: searchQuery, startDate, endDate
 * @returns Company settings with enhanced relationship data
 */
export async function getOptimizedCompanySettingsByUserId(
  userId: number,
  options?: {
    searchQuery?: string;
    startDate?: number;
    endDate?: number;
    includedImageFile?: boolean;
  }
) {
  const {
    searchQuery = '',
    startDate = 0,
    endDate = Math.floor(Date.now() / 1000),
    includedImageFile = false,
  } = options || {};

  let companySettings: ICompanySettingWithRelations[] = [];
  const companySettingsMap = new Map<number, ICompanySettingWithRelations>();

  try {
    // Step 1: First get user's team IDs without nesting await
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
      return { companySettings, companySettingsMap };
    }

    // Step 2: Get company settings with proper filter conditions in a single query
    const results = await prisma.companySetting.findMany({
      where: {
        company: {
          teamId: { in: teamIds },
          name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
          createdAt: { gte: startDate, lte: endDate },
          AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
        },
      },
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

    // Type cast the results to our interface
    companySettings = results as ICompanySettingWithRelations[];

    // Build a map for quick access to settings by company ID
    companySettings.forEach((setting) => {
      if (setting.companyId && setting.company) {
        companySettingsMap.set(setting.companyId, setting);
      }
    });

    loggerBack.info(`Retrieved ${companySettings.length} company settings for user ${userId}`);
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get optimized company settings failed',
      errorMessage: (error as Error).message,
    });
  }

  return { companySettings, companySettingsMap };
}
