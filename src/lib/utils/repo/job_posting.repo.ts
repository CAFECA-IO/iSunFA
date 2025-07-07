import prisma from '@/client';
import { IVacancy, IVacancyDetail } from '@/interfaces/vacancy';
import { Prisma, PrismaClient } from '@prisma/client';
import { STATUS_MESSAGE } from '@/constants/status_code';

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
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
};

export const getAllVacancies = async (tx: Prisma.TransactionClient | PrismaClient = prisma) => {
  try {
    // Info: (20250707 - Julian) Step 1: 取得所有開放的職缺
    const vacancies = await tx.jobPosting.findMany({
      where: {
        isOpen: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        updatedAt: true,
        isOpen: true,
      },
    });

    // Info: (20250707 - Julian) 如果沒有找到職缺，則回傳空陣列
    if (!vacancies || vacancies.length === 0) {
      return [];
    }

    // Info: (20250707 - Julian) Step 2: 整理格式
    const formattedVacancies: IVacancy[] = vacancies.map((vacancy) => ({
      id: vacancy.id,
      title: vacancy.title,
      location: vacancy.location,
      date: vacancy.updatedAt,
      description: vacancy.description,
      isOpen: vacancy.isOpen,
    }));

    return formattedVacancies;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
};
