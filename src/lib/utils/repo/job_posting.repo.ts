import prisma from '@/client';
import { IVacancy, IVacancyDetail } from '@/interfaces/vacancy';
import { Prisma, PrismaClient } from '@prisma/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { SortBy, SortOrder } from '@/constants/sort';
import { getTimestampNow } from '@/lib/utils/common';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';

export const getVacancyById = async (
  options: { vacancyId: number },
  tx: Prisma.TransactionClient | PrismaClient = prisma
) => {
  if (!options.vacancyId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_DATA);
  }

  try {
    // Info: (20250704 - Julian) Step 1: 根據 vacancyId 取得對應的 vacancy
    const vacancy = await tx.jobPosting.findUnique({
      where: {
        id: options.vacancyId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        isOpen: true,
        updatedAt: true,
      },
    });

    // Info: (20250704 - Julian) 如果沒有找到對應的 vacancy 或者職缺已經關閉，則回傳 null
    if (!vacancy || vacancy.isOpen === false) {
      return null;
    }

    // Info: (20250704 - Julian) Step 2: 根據 vacancyId 取得對應的職缺細節
    const details = await tx.jobPostingDetail.findMany({
      where: {
        jobPostingId: options.vacancyId,
      },
      select: {
        JobDetailType: true,
        value: true,
        order: true,
      },
    });

    const getDetailFormattedValue = (type: string) => {
      // Info: (20250704 - Julian) 取得對應的 detail
      const detailFormatted = details
        .filter((d) => d.JobDetailType === type)
        // Info: (20250704 - Julian) 排序
        .sort((a, b) => {
          return (a.order ?? 0) - (b.order ?? 0);
        })
        .map((detail) => detail.value);

      return detailFormatted;
    };

    // Info: (20250704 - Julian) Step 3: 整理格式
    const formattedDetails: IVacancyDetail = {
      id: vacancy.id,
      title: vacancy.title,
      location: vacancy.location,
      date: vacancy.updatedAt,
      description: vacancy.description,
      responsibilities: getDetailFormattedValue('RESPONSIBILITY'),
      requirements: getDetailFormattedValue('REQUIREMENT'),
      extraSkills: getDetailFormattedValue('EXTRA_SKILL'),
      isOpen: vacancy.isOpen,
    };
    return formattedDetails;
  } catch (error) {
    (error as Error).message = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
    throw error;
  }
};

export const listVacancy = async (
  queryParams: {
    page?: number;
    pageSize?: number;
    startDate?: number;
    endDate?: number;
    searchQuery?: string;
    sortOption?: { sortBy: SortBy; sortOrder: SortOrder }[];
  },
  tx: Prisma.TransactionClient | PrismaClient = prisma
) => {
  const nowInSecond = getTimestampNow();
  const {
    page = 1,
    pageSize = 10,
    startDate = 0,
    endDate = nowInSecond,
    searchQuery = '',
    sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
  } = queryParams;

  // Info: (20250707 - Julian) Step 1: 整理查詢條件
  const whereConditions: Prisma.JobPostingWhereInput = {
    // Info: (20250707 - Julian) 只查詢開放的職缺
    isOpen: true,
    // Info: (20250707 - Julian) 關鍵字查詢標題
    title: searchQuery ? { contains: searchQuery, mode: Prisma.QueryMode.insensitive } : undefined,
    // Info: (20250707 - Julian) 關鍵字查詢描述
    description: searchQuery
      ? { contains: searchQuery, mode: Prisma.QueryMode.insensitive }
      : undefined,
    // Info: (20250707 - Julian) 查詢更新日期在指定範圍內
    updatedAt: { gte: startDate, lte: endDate },
  };

  // Info: (20250707 - Julian) Step 2: 取得所有開放的職缺
  const vacancies = await tx.jobPosting.findMany({
    where: whereConditions,
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      updatedAt: true,
      isOpen: true,
    },
    skip: (page - 1) * pageSize,
    take: Number(pageSize),
    // ToDo: (20250707 - Julian) 排序
    // orderBy: sortOption.map((option) => ({
    //   [option.sortBy]: option.sortOrder === SortOrder.ASC ? 'asc' : 'desc',
    // })),
  });

  // Info: (20250707 - Julian) Step 3: 整理格式
  const formattedVacancies: IVacancy[] = vacancies.map((vacancy) => ({
    id: vacancy.id,
    title: vacancy.title,
    location: vacancy.location,
    date: vacancy.updatedAt,
    description: vacancy.description,
    isOpen: vacancy.isOpen,
  }));

  // Info: (20250707 - Julian) 計算總數量
  const totalCount = formattedVacancies.length;
  // Info: (20250707 - Julian) 計算總頁數
  const totalPages = Math.ceil(totalCount / pageSize);

  const result = toPaginatedData({
    data: formattedVacancies,
    page,
    pageSize,
    totalCount,
    totalPages,
    sort: sortOption,
  });

  return result;
};
