import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IContract, newDummyContracts } from '@/interfaces/contract';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IContract | IContract[]>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = {} as IContract | IContract[];
  try {
    switch (req.method) {
      case 'GET': {
        // let shouldContinue: boolean = true;
        // TODO: (20240625 - Jacky) checkAuth
        // TODO: (20240625 - Jacky) listContract
        const contractList = newDummyContracts;
        statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
        payload = contractList;
        break;
      }
      case 'POST': {
        // let shouldContinue: boolean = true;
        // TODO: (20240625 - Jacky) checkAuth
        // TODO: (20240625 - Jacky) createContract
        const contract: IContract = newDummyContracts[0];
        statusMessage = STATUS_MESSAGE.CREATED;
        payload = contract;
        break;
      }
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        payload = {} as IContract;
        break;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = {} as IContract;
  }
  const { httpCode, result } = formatApiResponse<IContract | IContract[]>(statusMessage, payload);
  res.status(httpCode).json(result);
}
