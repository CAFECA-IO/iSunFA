import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICard } from '@/interfaces/card';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

async function getCardById(cardId: number) {
  const card: ICard = {
    id: cardId,
    type: 'VISA',
    no: '1234-1234-1234-1234',
    expireYear: '29',
    expireMonth: '01',
    cvc: '330',
    name: 'Taiwan Bank',
    companyId: 4,
  };
  return card;
}

async function updateCardById(
  cardId: number,
  type?: string,
  no?: string,
  expireYear?: string,
  expireMonth?: string,
  cvc?: string,
  name?: string
) {
  const updatedCard = {
    id: cardId,
    type,
    no,
    expireYear,
    expireMonth,
    cvc,
    name,
    companyId: 4,
  };
  return updatedCard;
}

async function deleteCardById(cardId: number) {
  const deletedCard = {
    id: cardId,
    type: 'VISA',
    no: '1234-1234-1234-1234',
    expireYear: '29',
    expireMonth: '01',
    cvc: '330',
    name: 'Taiwan Bank',
    companyId: 4,
  };
  return deletedCard;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICard>>
) {
  const { method } = req;
  const { cardId } = req.query;
  const cardIdNum = Number(cardId);
  try {
    if (!req.headers.userid) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    if (!cardId) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    // Info: (20240419 - Jacky) P010002 - GET /payment/:id
    if (method === 'GET') {
      const card: ICard = await getCardById(cardIdNum);
      if (!card) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      const { httpCode, result } = formatApiResponse<ICard>(STATUS_MESSAGE.SUCCESS_GET, card);
      res.status(httpCode).json(result);
    } else if (method === 'PUT') {
      const { type, no, expireYear, expireMonth, cvc, name } = req.body;
      if (!type && !no && !expireYear && !expireMonth && !cvc && !name) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const card: ICard = (await updateCardById(
        cardIdNum,
        type,
        no,
        expireYear,
        expireMonth,
        cvc,
        name
      )) as ICard;
      const { httpCode, result } = formatApiResponse<ICard>(STATUS_MESSAGE.SUCCESS_UPDATE, card);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) P010004 - DELETE /payment/:id
    } else if (method === 'DELETE') {
      const payment: ICard = await deleteCardById(cardIdNum);
      const { httpCode, result } = formatApiResponse<ICard>(STATUS_MESSAGE.SUCCESS_DELETE, payment);
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
