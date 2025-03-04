import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IAccountBookForUserWithTeam, WORK_TAG } from '@/interfaces/account_book';
import { TeamRole } from '@/interfaces/team';
import { TPlanType } from '@/interfaces/subscription';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { toPaginatedData } from '@/lib/utils/formatter/pagination';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import {
  IAccountBookListQueryParams,
  IAccountBookListResponse,
} from '@/lib/utils/zod_schema/account_book';

const mockAccountBooks: IAccountBookForUserWithTeam[] = [
  {
    teamId: 10000001,
    company: {
      id: 10000001,
      imageId: 'https://example.com/images/burger-king.png',
      name: 'BURGER KING',
      taxId: '12345678',
      startDate: 1725372460,
      createdAt: 1725372460,
      updatedAt: 1725372460,
      isPrivate: false,
    },
    team: {
      id: '10000001',
      imageId: 'https://example.com/images/team-a.png',
      role: TeamRole.OWNER,
      name: {
        value: "Joyce's Team A",
        editable: true,
      },
      about: {
        value: 'Team A for BURGER KING',
        editable: true,
      },
      profile: {
        value: 'https://isunfa.com',
        editable: true,
      },
      planType: {
        value: TPlanType.ENTERPRISE,
        editable: true,
      },
      totalMembers: 6,
      totalAccountBooks: 3,
      bankAccount: {
        value: '12345678',
        editable: true,
      },
    },
    tag: WORK_TAG.FINANCIAL,
    order: 1,
    role: {
      id: 1,
      name: 'ADMIN',
      permissions: ['READ', 'WRITE', 'DELETE'],
      createdAt: 1725372460,
      updatedAt: 1725372460,
    },
    isTransferring: true,
  },
  {
    teamId: 10000001,
    company: {
      id: 10000002,
      imageId: 'https://example.com/images/burger-queen.png',
      name: 'BURGER QUEEN',
      taxId: '87654321',
      startDate: 1725372460,
      createdAt: 1725372460,
      updatedAt: 1725372460,
      isPrivate: false,
    },
    team: {
      id: '10000001',
      imageId: 'https://example.com/images/team-a.png',
      role: TeamRole.OWNER,
      name: {
        value: "Joyce's Team A",
        editable: true,
      },
      about: {
        value: 'Team A for BURGER QUEEN',
        editable: true,
      },
      profile: {
        value: 'https://isunfa.com',
        editable: true,
      },
      planType: {
        value: TPlanType.ENTERPRISE,
        editable: true,
      },
      totalMembers: 6,
      totalAccountBooks: 3,
      bankAccount: {
        value: '12345678',
        editable: true,
      },
    },
    tag: WORK_TAG.TAX,
    order: 2,
    role: {
      id: 2,
      name: 'MEMBER',
      permissions: ['READ', 'WRITE'],
      createdAt: 1725372460,
      updatedAt: 1725372460,
    },
    isTransferring: false,
  },
  {
    teamId: 10000002,
    company: {
      id: 10000003,
      imageId: 'https://example.com/images/burger-knight.png',
      name: 'BURGER KNIGHT',
      taxId: '13579246',
      startDate: 1725372460,
      createdAt: 1725372460,
      updatedAt: 1725372460,
      isPrivate: true,
    },
    team: {
      id: '10000002',
      imageId: 'https://example.com/images/team-b.png',
      role: TeamRole.ADMIN,
      name: {
        value: "Joyce's Team B",
        editable: true,
      },
      about: {
        value: 'Team B for BURGER KNIGHT',
        editable: true,
      },
      profile: {
        value: 'https://isunfa.com',
        editable: true,
      },
      planType: {
        value: TPlanType.PROFESSIONAL,
        editable: true,
      },
      totalMembers: 2,
      totalAccountBooks: 2,
      bankAccount: {
        value: '87654321',
        editable: true,
      },
    },
    tag: WORK_TAG.ALL,
    order: 3,
    role: {
      id: 1,
      name: 'ADMIN',
      permissions: ['READ', 'WRITE', 'DELETE'],
      createdAt: 1725372460,
      updatedAt: 1725372460,
    },
    isTransferring: false,
  },
];

const handleGetRequest: IHandleRequest<
  APIName.LIST_ACCOUNT_BOOK_BY_USER_ID,
  IAccountBookListResponse
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBookListResponse | null = null;

  const { userId, page, pageSize } = query as IAccountBookListQueryParams;

  loggerBack.info(`List account books by userId: ${userId} with query: ${JSON.stringify(query)}`);

  // Info: (20240324 - Shirley) 取得帳本列表
  const accountBooks = mockAccountBooks || [];

  // Info: (20240324 - Shirley) 處理分頁
  const options: IPaginatedOptions<IAccountBookForUserWithTeam[]> = {
    data: accountBooks,
    page,
    pageSize,
  };

  const paginatedData = toPaginatedData(options);

  // Info: (20240324 - Shirley) 驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.LIST_ACCOUNT_BOOK_BY_USER_ID,
    paginatedData
  );

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    payload = outputData;
  }

  return { statusMessage, payload };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountBookListResponse | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBookListResponse | null = null;

  try {
    if (req.method === 'GET') {
      const result = await withRequestValidation(
        APIName.LIST_ACCOUNT_BOOK_BY_USER_ID,
        req,
        handleGetRequest
      );
      statusMessage = result.statusMessage;
      payload = result.payload;
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IAccountBookListResponse | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
