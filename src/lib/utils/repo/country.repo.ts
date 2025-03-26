import prisma from '@/client';
import { Country } from '@prisma/client';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';

/**
 * Info: (20250326 - Shirley)
 * 根據國家 ID 獲取國家資訊
 * @param id 國家 ID
 * @returns 國家資訊或 null（如未找到）
 */
export async function getCountryById(id: number): Promise<Country | null> {
  try {
    const country = await prisma.country.findUnique({
      where: {
        id,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });
    return country;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get country in getCountryById failed',
      errorMessage: (error as Error).message,
    });
    return null;
  }
}

/**
 * Info: (20250326 - Shirley)
 * 根據國家代碼獲取國家資訊
 * @param code 國家代碼
 * @returns 國家資訊或 null（如未找到）
 */
export async function getCountryByCode(code: string): Promise<Country | null> {
  try {
    const country = await prisma.country.findFirst({
      where: {
        code,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });
    return country;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get country in getCountryByCode failed',
      errorMessage: (error as Error).message,
    });
    return null;
  }
}

/**
 * Info: (20250326 - Shirley)
 * 根據 localeKey 獲取國家資訊
 * @param localeKey 語言地區鍵
 * @returns 國家資訊或 null（如未找到）
 */
export async function getCountryByLocaleKey(localeKey: string): Promise<Country | null> {
  try {
    const country = await prisma.country.findFirst({
      where: {
        localeKey,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });
    return country;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get country in getCountryByLocaleKey failed',
      errorMessage: (error as Error).message,
    });
    return null;
  }
}

/**
 * Info: (20250326 - Shirley)
 * 獲取所有國家列表
 * @returns 國家列表或空陣列（如發生錯誤）
 */
export async function listCountries(): Promise<Country[]> {
  try {
    const countries = await prisma.country.findMany({
      where: {
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      orderBy: {
        name: 'asc',
      },
    });
    return countries;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'list countries in listCountries failed',
      errorMessage: (error as Error).message,
    });
    return [];
  }
}
