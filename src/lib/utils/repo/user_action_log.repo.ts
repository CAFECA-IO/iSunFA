import prisma from '@/client';
import { Prisma, UserActionLog } from '@prisma/client';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import {
  getCodeByMessage,
  pageToOffset,
  statusCodeToHttpCode,
  timestampInSeconds,
} from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { SortBy, UserActionLogActionType } from '@/constants/user_action_log';
import { loggerError } from '@/lib/utils/logger_back';

export async function createUserActionLog(data: {
  sessionId: string;
  userId: number;
  actionType: UserActionLogActionType;
  actionDescription: string;
  ipAddress: string;
  userAgent: string;
  apiEndpoint: string;
  httpMethod: string;
  requestPayload: Record<string, string>;
  statusMessage: string;
}) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const { code, message } = getCodeByMessage(data.statusMessage);
  const httpStatusCode = statusCodeToHttpCode(code);
  const userActionLog = await prisma.userActionLog.create({
    data: {
      ...data,
      httpStatusCode,
      statusMessage: message,
      actionTime: nowTimestamp,
    },
  });
  return userActionLog;
}
export async function listUserActionLog(
  userId: number,
  actionType: UserActionLogActionType,
  targetPage: number = DEFAULT_PAGE_NUMBER,
  pageSize: number = DEFAULT_PAGE_LIMIT,
  startDateInSecond?: number,
  endDateInSecond?: number,
  sortOrder: SortOrder = SortOrder.DESC,
  sortBy: SortBy = SortBy.ACTION_TIME
): Promise<{
  data: UserActionLog[];
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  sort: { sortBy: string; sortOrder: string }[];
}> {
  let userActionLogList: UserActionLog[] = [];
  const where: Prisma.UserActionLogWhereInput = {
    userId,
    actionType,
    AND: [{ actionTime: { gte: startDateInSecond } }, { actionTime: { lte: endDateInSecond } }],
  };

  const findManyArgs: Prisma.UserActionLogFindManyArgs = {
    where,
    orderBy: {
      [sortBy]: sortOrder,
    },
  };

  try {
    userActionLogList = await prisma.userActionLog.findMany(findManyArgs);
  } catch (error) {
    const logError = loggerError(
      0,
      'find many user action logs in listUserActionLogs failed',
      error as Error
    );
    logError.error('Prisma related find many user action logs in listUserActionLogs failed');
  }

  const totalCount = userActionLogList.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (targetPage < 1) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const skip = pageToOffset(targetPage, pageSize);

  const paginatedUserActionLogs = userActionLogList.slice(skip, skip + pageSize);

  const hasNextPage = skip + pageSize < totalCount;
  const hasPreviousPage = targetPage > 1;

  const sort: { sortBy: string; sortOrder: string }[] = [{ sortBy, sortOrder }];

  return {
    data: paginatedUserActionLogs,
    page: targetPage,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    sort,
  };
}

export async function deleteUserActionLogForTesting(id: number): Promise<UserActionLog | null> {
  try {
    const deletedLog = await prisma.userActionLog.delete({
      where: { id },
    });
    return deletedLog;
  } catch (error) {
    const logError = loggerError(0, 'delete user action log failed', error as Error);
    logError.error('Prisma related delete user action log failed');
    return null;
  }
}
