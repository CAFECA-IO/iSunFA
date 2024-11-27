import prisma from '@/client';
import { NewsType } from '@/constants/news';
import { Prisma, News } from '@prisma/client';
import { getTimestampNow, pageToOffset } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { SortOrder } from '@/constants/sort';
import { loggerError } from '@/lib/utils/logger_back';
import { SortBy } from '@/constants/journal';

export async function createNews(imageId: number, title: string, content: string, type: NewsType) {
  const nowInSecond = getTimestampNow();
  let news: News | null = null;

  try {
    news = await prisma.news.create({
      data: {
        imageId,
        title,
        content,
        type,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
      },
    });
  } catch (error) {
    loggerError({
      userId: 0,
      errorType: 'create news in createNews failed',
      errorMessage: (error as Error).message,
    });
  }

  return news;
}

export async function listNews(
  type: NewsType = NewsType.FINANCIAL,
  targetPage: number = DEFAULT_PAGE_NUMBER,
  pageSize: number = DEFAULT_PAGE_LIMIT,
  startDateInSecond?: number,
  endDateInSecond?: number,
  searchQuery?: string,
  sortOrder: SortOrder = SortOrder.ASC,
  sortBy: SortBy = SortBy.CREATED_AT
) {
  let newsList: News[] = [];
  const where: Prisma.NewsWhereInput = {
    type,
    AND: [
      { createdAt: { gte: startDateInSecond } },
      { createdAt: { lte: endDateInSecond } },
      { OR: [{ deletedAt: 0 }, { deletedAt: null }] },
      {
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { content: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
    ],
  };

  const findManyArgs = {
    where,
    orderBy: {
      [sortBy]: sortOrder,
    },
  };
  try {
    newsList = await prisma.news.findMany(findManyArgs);
  } catch (error) {
    loggerError({
      userId: 0,
      errorType: 'find many news in listNews failed',
      errorMessage: (error as Error).message,
    });
  }

  const totalCount = newsList.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (targetPage < 1) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const skip = pageToOffset(targetPage, pageSize);

  const paginatedNews = newsList.slice(skip, skip + pageSize);

  const hasNextPage = skip + pageSize < totalCount;
  const hasPreviousPage = targetPage > 1;

  const sort: {
    sortBy: string;
    sortOrder: string;
  }[] = [{ sortBy, sortOrder }];

  return {
    data: paginatedNews,
    page: targetPage,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    sort,
  };
}

export async function listNewsSimple(
  type: NewsType = NewsType.FINANCIAL,
  pageSize: number = DEFAULT_PAGE_LIMIT
) {
  let newsList: News[] = [];
  const where: Prisma.NewsWhereInput = {
    type,
  };

  const findManyArgs: Prisma.NewsFindManyArgs = {
    where,
    take: pageSize,
  };
  try {
    newsList = await prisma.news.findMany(findManyArgs);
  } catch (error) {
    loggerError({
      userId: 0,
      errorType: 'find many news in listNewsSimple failed',
      errorMessage: (error as Error).message,
    });
  }

  return newsList;
}

export async function getNewsById(newsId: number): Promise<News | null> {
  let news: News | null = null;

  try {
    news = await prisma.news.findUnique({
      where: {
        id: newsId,
      },
    });
  } catch (error) {
    loggerError({
      userId: 0,
      errorType: 'find unique news in getNewsById failed',
      errorMessage: (error as Error).message,
    });
  }

  return news;
}

export async function deleteNewsForTesting(newsId: number) {
  try {
    await prisma.news.delete({
      where: {
        id: newsId,
      },
    });
  } catch (error) {
    loggerError({
      userId: 0,
      errorType: 'delete news in deleteNewsForTesting failed',
      errorMessage: (error as Error).message,
    });
  }
}
