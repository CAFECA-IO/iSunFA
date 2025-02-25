import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IAccountBookForUserWithTeam } from '@/interfaces/account_book';

const mockAccountBooks: IAccountBookForUserWithTeam[] = [
  {
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
      id: 10000001,
      name: "Joyce's Team A",
      description: 'Team A for BURGER KING',
      imageId: 'https://example.com/images/team-a.png',
      createdAt: 1725372460,
      updatedAt: 1725372460,
    },
    tag: 'FINANCIAL',
    order: 1,
    role: {
      id: 1,
      name: 'ADMIN',
      permissions: ['READ', 'WRITE', 'DELETE'],
    },
  },
  {
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
      id: 10000001,
      name: "Joyce's Team A",
      description: 'Team A for BURGER QUEEN',
      imageId: 'https://example.com/images/team-a.png',
      createdAt: 1725372460,
      updatedAt: 1725372460,
    },
    tag: 'TAX',
    order: 2,
    role: {
      id: 2,
      name: 'MEMBER',
      permissions: ['READ', 'WRITE'],
    },
  },
  {
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
      id: 10000002,
      name: "Joyce's Team B",
      description: 'Team B for BURGER KNIGHT',
      imageId: 'https://example.com/images/team-b.png',
      createdAt: 1725372460,
      updatedAt: 1725372460,
    },
    tag: 'ALL',
    order: 3,
    role: {
      id: 1,
      name: 'ADMIN',
      permissions: ['READ', 'WRITE', 'DELETE'],
    },
  },
];

const handleGetRequest: IHandleRequest<
  APIName.LIST_ACCOUNT_BOOK_BY_USER_ID,
  IAccountBookForUserWithTeam[]
> = async ({ query }) => {
  // TODO: (20250225 - Shirley) 實作 API
  // Deprecated: (20250307 - Shirley)
  // eslint-disable-next-line no-console
  console.log('query', query);
  const statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  const payload = mockAccountBooks;
  return { statusMessage, payload };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountBookForUserWithTeam[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBookForUserWithTeam[] | null = null;

  try {
    if (req.method === 'GET') {
      const result = await withRequestValidation(
        APIName.LIST_ACCOUNT_BOOK_BY_USER_ID,
        req,
        handleGetRequest
      );
      statusMessage = result.statusMessage;
      payload = result.payload as IAccountBookForUserWithTeam[] | null;
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IAccountBookForUserWithTeam[] | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
