import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IContract, newDummyContracts } from '@/interfaces/contract';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IContract | IContract[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IContract | IContract[] | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

  if (isAuth) {
    try {
      switch (req.method) {
        case 'GET': {
          // let shouldContinue: boolean = true;
          // TODO: [Beta] (20240625 - Jacky) listContract
          const contractList = newDummyContracts;
          statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
          payload = contractList;
          break;
        }
        case 'POST': {
          // let shouldContinue: boolean = true;
          // TODO: [Beta] (20240625 - Jacky) createContract
          const contract: IContract = newDummyContracts[0];
          statusMessage = STATUS_MESSAGE.CREATED;
          payload = contract;
          break;
        }
        default:
          statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
          break;
      }
    } catch (_error) {
      // ToDo: [Beta] (20240822 - Murky) please used logger to print error
      // const error = _error as Error;

      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }
  const { httpCode, result } = formatApiResponse<IContract | IContract[] | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
