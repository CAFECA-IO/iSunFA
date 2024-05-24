import { NextApiRequest, NextApiResponse } from 'next';
import { ICard } from '@/interfaces/card';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import prisma from '@/client';
import { getSession } from '@/lib/utils/get_session';

async function getCardList() {
  const cardList = await prisma.card.findMany();
  return cardList;
}

async function createCard(
  type: string,
  no: string,
  expireYear: string,
  expireMonth: string,
  cvc: string,
  name: string,
  companyId: number
): Promise<ICard> {
  const createdCard = await prisma.card.create({
    data: {
      type,
      no,
      expireYear,
      expireMonth,
      cvc,
      name,
      company: {
        connect: {
          id: companyId,
        },
      },
    },
  });
  return createdCard;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICard | ICard[]>>
) {
  try {
    // Info: (20240419 - Jacky) P010001 - GET /payment
    const session = await getSession(req, res);
    if (!session.userId) {
      throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
    }
    if (req.method === 'GET') {
      const cardList = await getCardList();
      const { httpCode, result } = formatApiResponse<ICard[]>(
        STATUS_MESSAGE.SUCCESS_LIST,
        cardList
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) P010003 - POST /payment
    } else if (req.method === 'POST') {
      const { type, no, expireYear, expireMonth, cvc, name } = req.body;
      if (!type || !no || !expireYear || !expireMonth || !cvc || !name) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const { companyId } = session;
      if (!companyId) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const createdCard: ICard = await createCard(
        type,
        no,
        expireYear,
        expireMonth,
        cvc,
        name,
        companyId
      );
      const { httpCode, result } = formatApiResponse<ICard>(STATUS_MESSAGE.CREATED, createdCard);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ICard>(error.message, {} as ICard);
    res.status(httpCode).json(result);
  }
}
